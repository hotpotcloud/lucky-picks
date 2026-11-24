"""AI 分析接口测试（mock 外部模型调用）。"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.db.database import Database


def login(client: TestClient) -> str:
    """登录并返回令牌。

    Args:
        client: 测试客户端。

    Returns:
        令牌。
    """
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "888888"})
    return response.json()["data"]["token"]


def test_ai_configured_endpoint(client: TestClient) -> None:
    """配置状态接口返回布尔值。"""
    token = login(client)
    response = client.get("/api/v1/ai/configured", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "available" in response.json()["data"]


def test_ai_analysis_mocked(client: TestClient, database: Database) -> None:
    """AI 分析接口返回模型固定为 deepseek-v4.1-flash。"""
    token = login(client)

    fake_response = type(
        "Resp",
        (),
        {
            "status_code": 200,
            "text": "",
            "json": lambda self: {
                "choices": [
                    {
                        "message": {
                            "content": "历史频率显示部分号码偏热，但开奖为独立随机事件，"
                            "统计不改变下一期概率。",
                            "reasoning_content": "",
                        }
                    }
                ]
            },
        },
    )()

    class FakeClient:
        """模拟 httpx.Client。"""

        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, headers: dict, json: dict) -> object:  # noqa: A002
            assert json["model"] == "deepseek-v4.1-flash"
            assert "x-opencode-session" in headers
            return fake_response

    with (
        patch("app.ai.service.httpx.Client", FakeClient),
        patch("app.ai.service.os.getenv", return_value="test-key"),
    ):
        response = client.get(
            "/api/v1/ai/analysis/redblue?window=100",
            headers={"Authorization": f"Bearer {token}", "x-opencode-session": "test-session"},
        )

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["model"] == "deepseek-v4.1-flash"
    assert "概率" in body["content"]
