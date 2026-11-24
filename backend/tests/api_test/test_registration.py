"""注册回归：真实账号创建、鉴权及输入边界。"""

from fastapi.testclient import TestClient


def test_registration_and_session(client: TestClient) -> None:
    """匿名注册后获得普通用户令牌，令牌可查询身份及访问数据接口。"""
    response = client.post("/api/v1/auth/register", json={"username": "reader", "password": "reader-pass"})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["user"]["role"] == "user"
    headers = {"Authorization": f"Bearer {data['token']}"}
    assert client.get("/api/v1/auth/me", headers=headers).json()["data"]["username"] == "reader"
    assert client.get("/api/v1/draws/redblue", headers=headers).status_code == 200
    assert client.post("/api/v1/auth/login", json={"username": "reader", "password": "reader-pass"}).status_code == 200


def test_duplicate_registration(client: TestClient) -> None:
    """已有用户名不可重复注册，也不可借助注册请求提升权限。"""
    response = client.post("/api/v1/auth/register", json={"username": "admin", "password": "other-pass", "role": "admin"})
    assert response.status_code == 409


def test_registration_validation(client: TestClient) -> None:
    """空白用户名与弱密码在写入数据库之前被拒绝。"""
    for payload in ({"username": "   ", "password": "reader-pass"}, {"username": "reader", "password": "123"}):
        assert client.post("/api/v1/auth/register", json=payload).status_code == 422
