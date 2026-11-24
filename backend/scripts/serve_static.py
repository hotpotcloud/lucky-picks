"""静态站点服务：禁用缓存，并把同源 API 请求转发到本机后端。"""

import functools
import http.client
import http.server
import json
import os
import socket
import sys
from collections.abc import Callable
from pathlib import Path
from typing import ClassVar

from loguru import logger

DEFAULT_WEB_PORT = 1689
DEFAULT_SERVICE_PORT = 1688
CLIENT_SOCKET_TIMEOUT_SECONDS = 10
MAX_REQUEST_BODY_BYTES = 1024 * 1024
API_PREFIX = "/api/"
REQUEST_HEADERS = ("Authorization", "Content-Type", "Accept")
RESPONSE_HEADERS = ("Content-Type", "Content-Length", "Cache-Control")


def setup_logging() -> None:
    """初始化安全日志，关闭可能泄露局部变量的诊断输出。"""
    logger.remove()
    logger.add(
        sys.stderr,
        level="INFO",
        backtrace=False,
        diagnose=False,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    )


class StaticProxyHandler(http.server.SimpleHTTPRequestHandler):
    """提供静态文件，并将允许的 API 请求代理到本机后端。"""

    service_port: ClassVar[int] = DEFAULT_SERVICE_PORT

    def setup(self) -> None:
        """初始化客户端连接，并限制慢连接占用线程的时间。"""
        super().setup()
        self.connection.settimeout(CLIENT_SOCKET_TIMEOUT_SECONDS)

    def end_headers(self) -> None:
        """写入禁止缓存的响应头。"""
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_GET(self) -> None:
        """处理静态资源或代理 GET API 请求。"""
        if self.path.startswith(API_PREFIX):
            self._proxy_api()
            return
        super().do_GET()

    def do_POST(self) -> None:
        """代理 POST API 请求，其他路径按不存在处理。"""
        if self.path.startswith(API_PREFIX):
            self._proxy_api()
            return
        self.send_error(404)

    def do_HEAD(self) -> None:
        """静态资源支持 HEAD，API 仅允许 GET 和 POST。"""
        if self.path.startswith(API_PREFIX):
            self._send_json(405, "METHOD_NOT_ALLOWED", "仅支持 GET 和 POST", include_body=False)
            return
        super().do_HEAD()

    def do_OPTIONS(self) -> None:
        """拒绝不需要的同源 API 预检请求。"""
        self._reject_api_method()

    def do_PUT(self) -> None:
        """拒绝 PUT 请求。"""
        self._reject_api_method()

    def do_PATCH(self) -> None:
        """拒绝 PATCH 请求。"""
        self._reject_api_method()

    def do_DELETE(self) -> None:
        """拒绝 DELETE 请求。"""
        self._reject_api_method()

    def _reject_api_method(self) -> None:
        """仅对 API 路径返回固定 405，避免误把写请求交给静态服务。"""
        if self.path.startswith(API_PREFIX):
            self._send_json(405, "METHOD_NOT_ALLOWED", "仅支持 GET 和 POST")
            return
        self.send_error(405)

    def _proxy_api(self) -> None:
        """把请求转发到固定本机端口，并隐藏上游连接错误详情。"""
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, "INVALID_CONTENT_LENGTH", "请求体长度不合法")
            return
        if content_length < 0:
            self._send_json(400, "INVALID_CONTENT_LENGTH", "请求体长度不合法")
            return
        if content_length > MAX_REQUEST_BODY_BYTES:
            self._send_json(413, "PAYLOAD_TOO_LARGE", "请求体不能超过 1 MiB")
            return
        request_body = self.rfile.read(content_length) if content_length else None
        request_headers = {
            name: value
            for name in REQUEST_HEADERS
            if (value := self.headers.get(name)) is not None
        }
        # 始终使用实际连接地址，禁止来访请求伪造代理来源。
        request_headers["X-Forwarded-For"] = self.client_address[0]
        connection = http.client.HTTPConnection("127.0.0.1", self.service_port, timeout=10)
        try:
            connection.request(self.command, self.path, body=request_body, headers=request_headers)
            response = connection.getresponse()
            response_body = response.read()
            self.send_response(response.status)
            for name in RESPONSE_HEADERS:
                if value := response.getheader(name):
                    self.send_header(name, value)
            self.end_headers()
            self.wfile.write(response_body)
        except (OSError, socket.timeout, http.client.HTTPException):
            logger.exception(
                "API 代理失败：method={} path={}",
                self.command,
                self.path.split("?", 1)[0],
            )
            self._send_json(502, "BAD_GATEWAY", "后端服务暂不可用")
        finally:
            connection.close()

    def _send_json(
        self,
        status: int,
        code: str,
        message: str,
        *,
        include_body: bool = True,
    ) -> None:
        """返回固定 JSON 错误，不暴露上游地址、凭据或异常文本。"""
        body = json.dumps(
            {"code": code, "message": message},
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if include_body:
            self.wfile.write(body)


def create_handler(
    root: str | os.PathLike[str],
    service_port: int,
) -> Callable[..., StaticProxyHandler]:
    """创建绑定静态目录和本机后端端口的请求处理器。

    Args:
        root: 前端构建产物目录。
        service_port: 本机后端监听端口。

    Returns:
        可传给 ``ThreadingHTTPServer`` 的处理器工厂。
    """

    class ConfiguredHandler(StaticProxyHandler):
        """绑定本次服务配置的请求处理器。"""

    ConfiguredHandler.service_port = service_port
    return functools.partial(ConfiguredHandler, directory=str(Path(root).resolve()))


def main() -> None:
    """解析启动参数并运行静态站点服务。"""
    setup_logging()
    web_port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WEB_PORT
    default_root = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    root = sys.argv[2] if len(sys.argv) > 2 else default_root
    service_port = int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_SERVICE_PORT
    handler = create_handler(root, service_port)
    http.server.ThreadingHTTPServer(("0.0.0.0", web_port), handler).serve_forever()


if __name__ == "__main__":
    main()
