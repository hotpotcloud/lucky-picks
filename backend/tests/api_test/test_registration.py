"""注册回归：真实账号创建、鉴权及输入边界。"""

from fastapi.testclient import TestClient

from app.config.config import settings


def _create_invitation(client: TestClient) -> str:
    """登录内置管理员并创建一次性邀请码。

    场景：测试使用项目配置中的内置管理员，不在用例中复制账号密码。
    预期：已登录用户可获得仅本次响应返回的明文邀请码。
    """
    login = client.post(
        "/api/v1/auth/login",
        json={
            "username": settings.admin_username,
            "password": settings.admin_password,
        },
    )
    assert login.status_code == 200
    token = login.json()["data"]["token"]
    response = client.post(
        "/api/v1/auth/invitations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    return str(response.json()["data"]["code"])


def test_registration_and_session(client: TestClient) -> None:
    """有效邀请注册后获得普通用户令牌，令牌可查询身份及访问数据接口。"""
    invite_code = _create_invitation(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "reader",
            "password": "reader-pass",
            "inviteCode": invite_code,
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["user"]["role"] == "user"
    headers = {"Authorization": f"Bearer {data['token']}"}
    assert client.get("/api/v1/auth/me", headers=headers).json()["data"]["username"] == "reader"
    assert client.get("/api/v1/draws/redblue", headers=headers).status_code == 200
    assert client.post("/api/v1/auth/login", json={"username": "reader", "password": "reader-pass"}).status_code == 200


def test_duplicate_registration(client: TestClient) -> None:
    """重复账号失败时回滚邀请核销，同一邀请仍可用于其他账号。"""
    invite_code = _create_invitation(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": settings.admin_username,
            "password": "other-pass",
            "inviteCode": invite_code,
        },
    )
    assert response.status_code == 409
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "reader",
            "password": "reader-pass",
            "inviteCode": invite_code,
        },
    )
    assert response.status_code == 200
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "reader2",
            "password": "reader-pass",
            "inviteCode": invite_code,
            "role": "admin",
        },
    )
    assert response.status_code == 422


def test_registration_validation(client: TestClient) -> None:
    """空白用户名与弱密码在写入数据库之前被拒绝。"""
    invite_code = _create_invitation(client)
    for payload in (
        {"username": "   ", "password": "reader-pass", "inviteCode": invite_code},
        {"username": "reader", "password": "123", "inviteCode": invite_code},
    ):
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422
        assert '"input"' not in response.text


def test_registration_requires_unused_invitation(client: TestClient) -> None:
    """缺失、无效或已使用的邀请码均不能创建账号。

    场景：分别提交无邀请码、伪造邀请码和已成功核销的邀请码。
    预期：请求被拒绝，且同一邀请码最多创建一个普通用户。
    """
    credentials = {"username": "reader", "password": "reader-pass"}
    assert client.post("/api/v1/auth/register", json=credentials).status_code == 422
    invalid = client.post(
        "/api/v1/auth/register",
        json={**credentials, "inviteCode": "invalid-invitation"},
    )
    assert invalid.status_code == 400

    invite_code = _create_invitation(client)
    first = client.post(
        "/api/v1/auth/register",
        json={**credentials, "inviteCode": invite_code},
    )
    assert first.status_code == 200
    reused = client.post(
        "/api/v1/auth/register",
        json={
            "username": "reader2",
            "password": "reader-pass",
            "inviteCode": invite_code,
        },
    )
    assert reused.status_code == 400
