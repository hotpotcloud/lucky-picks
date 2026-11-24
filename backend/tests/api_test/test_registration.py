"""注册回归：真实账号创建、鉴权及输入边界。"""

from fastapi.testclient import TestClient

from app.auth.digest import derive_password_digest
from app.config.config import settings


def _login_payload(username: str, password: str) -> dict[str, str]:
    """构造只含摘要的登录请求体。"""
    return {"username": username, "passwordDigest": derive_password_digest(username, password)}


def _register_payload(username: str, password: str, invite_code: str) -> dict[str, object]:
    """构造只含摘要与密码长度的注册请求体。"""
    return {
        "username": username,
        "passwordDigest": derive_password_digest(username, password),
        "passwordLength": len(password),
        "inviteCode": invite_code,
    }


def _create_invitation(client: TestClient) -> str:
    """登录内置管理员并创建一次性邀请码。

    场景：测试使用项目配置中的内置管理员，不在用例中复制账号密码。
    预期：已登录用户可获得仅本次响应返回的明文邀请码。
    """
    login = client.post(
        "/api/v1/auth/login",
        json=_login_payload(settings.admin_username, settings.admin_password),
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
        json=_register_payload("reader", "reader-pass", invite_code),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["user"]["role"] == "user"
    headers = {"Authorization": f"Bearer {data['token']}"}
    assert client.get("/api/v1/auth/me", headers=headers).json()["data"]["username"] == "reader"
    assert client.get("/api/v1/draws/redblue", headers=headers).status_code == 200
    assert client.post("/api/v1/auth/login", json=_login_payload("reader", "reader-pass")).status_code == 200


def test_duplicate_registration(client: TestClient) -> None:
    """重复账号失败时回滚邀请核销，同一邀请仍可用于其他账号。"""
    invite_code = _create_invitation(client)
    response = client.post(
        "/api/v1/auth/register",
        json=_register_payload(settings.admin_username, "other-pass", invite_code),
    )
    assert response.status_code == 409
    response = client.post(
        "/api/v1/auth/register",
        json=_register_payload("reader", "reader-pass", invite_code),
    )
    assert response.status_code == 200
    response = client.post(
        "/api/v1/auth/register",
        json={**_register_payload("reader2", "reader-pass", invite_code), "role": "admin"},
    )
    assert response.status_code == 422


def test_registration_validation(client: TestClient) -> None:
    """空白用户名与弱密码在写入数据库之前被拒绝。"""
    invite_code = _create_invitation(client)
    weak_payload = _register_payload("reader", "123", invite_code)
    weak_payload["passwordLength"] = 3
    for payload in (
        {"username": "   ", "passwordDigest": derive_password_digest("   ", "reader-pass"), "passwordLength": 11, "inviteCode": invite_code},
        weak_payload,
    ):
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422
        assert '"input"' not in response.text


def test_registration_requires_unused_invitation(client: TestClient) -> None:
    """缺失、无效或已使用的邀请码均不能创建账号。

    场景：分别提交无邀请码、伪造邀请码和已成功核销的邀请码。
    预期：请求被拒绝，且同一邀请码最多创建一个普通用户。
    """
    credentials = _register_payload("reader", "reader-pass", "placeholder")
    credentials.pop("inviteCode")
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
        json=_register_payload("reader2", "reader-pass", invite_code),
    )
    assert reused.status_code == 400
