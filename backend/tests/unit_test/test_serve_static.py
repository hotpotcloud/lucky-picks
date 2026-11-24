"""静态站点同源 API 代理测试。"""

import json
import socket
import threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Iterator
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from scripts.serve_static import create_handler


class _UpstreamHandler(BaseHTTPRequestHandler):
    """记录代理请求并返回收到的请求信息。"""

    def _respond(self) -> None:
        """返回请求方法、路径、认证头和请求体。"""
        content_length = int(self.headers.get("Content-Length", "0"))
        payload = {
            "method": self.command,
            "path": self.path,
            "authorization": self.headers.get("Authorization"),
            "forwarded_for": self.headers.get("X-Forwarded-For"),
            "body": self.rfile.read(content_length).decode("utf-8"),
        }
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    do_GET = _respond
    do_POST = _respond

    def log_message(self, format: str, *args: object) -> None:
        """测试中关闭标准错误访问日志。"""


@contextmanager
def _running_server(
    handler: type[BaseHTTPRequestHandler],
) -> Iterator[ThreadingHTTPServer]:
    """在随机本机端口运行 HTTP 服务并在用例后关闭。"""
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_proxy_preserves_query_authorization_and_post_body(tmp_path: Path) -> None:
    """验证 GET/POST 同源代理不会损坏业务请求。

    前置条件：启动临时上游服务和静态代理服务。
    操作步骤：分别发送带查询串和认证头的 GET、带 JSON 请求体的 POST。
    预期结果：上游收到原方法、完整查询串、Authorization 和原始请求体。
    """
    with _running_server(_UpstreamHandler) as upstream:
        handler = create_handler(tmp_path, upstream.server_port)
        with _running_server(handler) as proxy:
            get_request = Request(
                f"http://127.0.0.1:{proxy.server_port}/api/v1/games?enabled=true",
                headers={
                    "Authorization": "Bearer test-token",
                    "X-Forwarded-For": "203.0.113.10",
                },
            )
            get_payload = json.loads(urlopen(get_request, timeout=3).read())

            post_request = Request(
                f"http://127.0.0.1:{proxy.server_port}/api/v1/auth/login?source=web",
                data=b'{"username":"tester"}',
                headers={
                    "Authorization": "Bearer test-token",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            post_payload = json.loads(urlopen(post_request, timeout=3).read())

    assert get_payload == {
        "method": "GET",
        "path": "/api/v1/games?enabled=true",
        "authorization": "Bearer test-token",
        "forwarded_for": "127.0.0.1",
        "body": "",
    }
    assert post_payload == {
        "method": "POST",
        "path": "/api/v1/auth/login?source=web",
        "authorization": "Bearer test-token",
        "forwarded_for": "127.0.0.1",
        "body": '{"username":"tester"}',
    }


def test_proxy_returns_safe_json_when_upstream_is_unavailable(tmp_path: Path) -> None:
    """验证后端不可达时返回安全且稳定的错误。

    前置条件：静态代理指向没有服务监听的本机端口。
    操作步骤：通过静态代理请求 API。
    预期结果：返回固定 502 JSON，不包含本机地址、端口或底层连接异常。
    """
    handler = create_handler(tmp_path, 1)
    with _running_server(handler) as proxy:
        request = Request(f"http://127.0.0.1:{proxy.server_port}/api/v1/games")
        try:
            urlopen(request, timeout=3)
        except HTTPError as exc:
            body = exc.read().decode("utf-8")
            status = exc.code
            content_type = exc.headers.get_content_type()
        else:
            raise AssertionError("上游不可达时应返回 HTTP 502")

    assert status == 502
    assert content_type == "application/json"
    assert json.loads(body) == {"code": "BAD_GATEWAY", "message": "后端服务暂不可用"}
    assert "127.0.0.1" not in body
    assert "Connection" not in body


def test_proxy_rejects_unsupported_api_method(tmp_path: Path) -> None:
    """验证静态代理拒绝未授权的 API 方法。

    前置条件：静态代理已启动。
    操作步骤：向 API 路径发送 PUT 请求。
    预期结果：请求不进入上游，返回固定 405 JSON 并声明仅支持 GET/POST。
    """
    handler = create_handler(tmp_path, 1)
    with _running_server(handler) as proxy:
        request = Request(
            f"http://127.0.0.1:{proxy.server_port}/api/v1/games",
            data=b"{}",
            method="PUT",
        )
        try:
            urlopen(request, timeout=3)
        except HTTPError as exc:
            body = exc.read()
            status = exc.code
        else:
            raise AssertionError("未知 API 方法应被拒绝")

    assert status == 405
    assert json.loads(body) == {"code": "METHOD_NOT_ALLOWED", "message": "仅支持 GET 和 POST"}


def test_proxy_rejects_invalid_or_oversized_content_length(tmp_path: Path) -> None:
    """验证请求体长度校验在读取请求体前生效。

    前置条件：静态代理已启动，后端端口无需可用。
    操作步骤：分别发送非数字 Content-Length 和超过 1 MiB 的长度声明。
    预期结果：代理返回 400 和 413，不读取大请求体，也不尝试连接后端。
    """
    handler = create_handler(tmp_path, 1)
    with _running_server(handler) as proxy:
        invalid_response = _send_raw_request(
            proxy.server_port,
            b"POST /api/v1/auth/register HTTP/1.1\r\n"
            b"Host: localhost\r\nContent-Length: invalid\r\nConnection: close\r\n\r\n",
        )
        oversized_response = _send_raw_request(
            proxy.server_port,
            b"POST /api/v1/auth/register HTTP/1.1\r\n"
            b"Host: localhost\r\nContent-Length: 1048577\r\nConnection: close\r\n\r\n",
        )

    assert invalid_response.startswith(b"HTTP/1.0 400")
    assert b"INVALID_CONTENT_LENGTH" in invalid_response
    assert oversized_response.startswith(b"HTTP/1.0 413")
    assert b"PAYLOAD_TOO_LARGE" in oversized_response


def _send_raw_request(port: int, request: bytes) -> bytes:
    """发送原始 HTTP 请求，用于覆盖标准客户端不允许构造的异常请求头。"""
    with socket.create_connection(("127.0.0.1", port), timeout=3) as connection:
        connection.sendall(request)
        chunks = []
        while chunk := connection.recv(4096):
            chunks.append(chunk)
    return b"".join(chunks)
