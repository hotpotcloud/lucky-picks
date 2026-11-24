"""通过前端同源代理验证真实 HTTP 注册、登录与数据链路。"""

import socket
import threading
import time
from http.server import ThreadingHTTPServer
from pathlib import Path

import httpx
import pytest
import uvicorn

import app.dependencies as dependencies
from app.config.config import settings
from app.db.database import Database
from app.main import app
from scripts.serve_static import create_handler


def test_frontend_proxy_auth_data_and_recommendation(
    database: Database, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """使用测试数据库启动真实 API 与前端服务，验证完整业务链路。

    场景：用户经前端端口注册，退出后重新登录，再查询身份、历史和推荐。
    预期：令牌真实校验、旧令牌失效、数据来自 API、推荐包含完整两区号码。
    数据仅使用测试夹具，不连接生产数据库、不访问外部数据源。
    """
    monkeypatch.setattr(dependencies, "_database", database)
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    service_port = listener.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, log_level="warning"))
    api_thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
    api_thread.start()
    (tmp_path / "index.html").write_text("<html>frontend</html>", encoding="utf-8")
    proxy = ThreadingHTTPServer(("127.0.0.1", 0), create_handler(tmp_path, service_port))
    proxy_thread = threading.Thread(target=proxy.serve_forever, daemon=True)
    proxy_thread.start()
    try:
        deadline = time.monotonic() + 5
        while not server.started and time.monotonic() < deadline:
            time.sleep(0.02)
        assert server.started, "后端测试服务未能启动"
        with httpx.Client(base_url=f"http://127.0.0.1:{proxy.server_port}", timeout=15) as client:
            assert client.get("/").status_code == 200
            credentials = {"username": "http_reader", "password": "test-reader-pass"}
            admin_login = client.post(
                "/api/v1/auth/login",
                json={
                    "username": settings.admin_username,
                    "password": settings.admin_password,
                },
            )
            assert admin_login.status_code == 200
            admin_headers = {
                "Authorization": f"Bearer {admin_login.json()['data']['token']}"
            }
            invitation = client.post(
                "/api/v1/auth/invitations",
                headers=admin_headers,
            )
            assert invitation.status_code == 200
            registration = client.post(
                "/api/v1/auth/register",
                json={
                    **credentials,
                    "inviteCode": invitation.json()["data"]["code"],
                },
            )
            assert registration.status_code == 200
            data = registration.json()["data"]
            assert data["user"]["role"] == "user"
            headers = {"Authorization": f"Bearer {data['token']}"}
            assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
            assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
            login = client.post("/api/v1/auth/login", json=credentials)
            assert login.status_code == 200
            headers = {"Authorization": f"Bearer {login.json()['data']['token']}"}
            assert client.get("/api/v1/auth/me", headers=headers).json()["data"]["username"] == "http_reader"
            draws = client.get("/api/v1/draws/redblue?limit=10", headers=headers)
            assert draws.status_code == 200
            assert len(draws.json()["data"]["items"]) == 10
            recommendation = client.post("/api/v1/recommendations", headers=headers, json={
                "game": "redblue", "mode": "single", "strategy": "balanced", "window": 100, "count": 1,
            })
            assert recommendation.status_code == 200
            areas = recommendation.json()["data"]["bets"][0]["areas"]
            assert len(areas) == 2
            assert [len(area["numbers"]) for area in areas] == [6, 1]
    finally:
        proxy.shutdown()
        proxy.server_close()
        proxy_thread.join(timeout=5)
        server.should_exit = True
        api_thread.join(timeout=5)
        listener.close()
