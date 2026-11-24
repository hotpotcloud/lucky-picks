"""API 测试：登录鉴权、数据接口与统一响应。"""

from fastapi.testclient import TestClient

from app.auth.digest import derive_password_digest
from app.db.database import Database


def login(client: TestClient) -> str:
    """登录并返回令牌。

    Args:
        client: 测试客户端。

    Returns:
        登录令牌。
    """
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin",
            "passwordDigest": derive_password_digest("admin", "888888"),
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    return body["data"]["token"]


def test_login_and_me(client: TestClient, database: Database) -> None:
    """默认账号可登录，且能查询当前用户。"""
    token = login(client)
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["data"]["username"] == "admin"


def test_wrong_password(client: TestClient) -> None:
    """错误密码返回 401。"""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin",
            "passwordDigest": derive_password_digest("admin", "wrong"),
        },
    )
    assert response.status_code == 401
    assert response.json()["code"] == 40100


def test_login_rejects_plaintext_password(client: TestClient) -> None:
    """登录接口不再接受明文密码字段，避免明文进入请求日志。"""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "888888"},
    )
    assert response.status_code == 422


def test_draws_requires_auth(client: TestClient) -> None:
    """未登录访问开奖数据返回 401。"""
    assert client.get("/api/v1/draws/redblue").status_code == 401


def test_draws_with_auth(client: TestClient) -> None:
    """登录后可以查询开奖数据。"""
    token = login(client)
    response = client.get(
        "/api/v1/draws/redblue?limit=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert len(body["data"]["items"]) == 10
    assert body["data"]["meta"]["drawCount"] == 120


def test_games_public(client: TestClient) -> None:
    """玩法规则接口公开可访问。"""
    response = client.get("/api/v1/games")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 2


def test_recommendation_api(client: TestClient) -> None:
    """推荐接口生成合法结果。"""
    token = login(client)
    response = client.post(
        "/api/v1/recommendations",
        json={
            "game": "redblue",
            "mode": "single",
            "strategy": "balanced",
            "window": 100,
            "count": 3,
            "seed": 123,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert len(response.json()["data"]["bets"]) == 3


def test_recommendation_api_reports_impossible_constraints(client: TestClient) -> None:
    """推荐约束与玩法数量冲突时返回可读业务错误。"""
    token = login(client)
    response = client.post(
        "/api/v1/recommendations",
        json={
            "game": "redblue",
            "mode": "single",
            "strategy": "random",
            "window": 100,
            "count": 1,
            "constraints": {"zoneCounts": [3, 3, 3]},
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["code"] != 0
    assert "三区数量" in response.json()["message"]


def test_backtest_api(client: TestClient) -> None:
    """回测接口返回汇总与随机基线。"""
    token = login(client)
    response = client.get(
        "/api/v1/backtest/redblue?strategy=balanced&window=50&draws=20&tickets=2",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "strategySummary" in data
    assert "baseline" in data
