"""鉴权服务：密码校验、令牌签发与校验。

令牌方案：自实现 HMAC-SHA256 签名令牌（形如 `payload.signature`），不引入第三方依赖。
- 载荷包含用户名、角色、令牌版本与过期时间；
- 服务端用数据库中持久化的密钥签名；
- 修改密码或退出全部设备时递增 token_version，使旧令牌立即失效。
"""

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Optional

from app.db.database import Database, User, verify_password

# 令牌载荷字段。
TOKEN_USERNAME = "sub"
TOKEN_ROLE = "role"
TOKEN_VERSION = "ver"
TOKEN_EXPIRED_AT = "exp"


@dataclass
class TokenPayload:
    """令牌载荷。

    Attributes:
        username: 登录名。
        role: 角色。
        token_version: 令牌版本。
        expired_at: 过期时间戳（秒）。
    """

    username: str
    role: str
    token_version: int
    expired_at: int


def _b64encode(raw: bytes) -> str:
    """Base64URL 编码（去掉填充）。

    Args:
        raw: 原始字节。

    Returns:
        编码后的字符串。
    """
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(raw: str) -> bytes:
    """Base64URL 解码。

    Args:
        raw: 编码字符串。

    Returns:
        原始字节。
    """
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def issue_token(database: Database, user: User, ttl_hours: int = 12) -> tuple[str, int]:
    """签发登录令牌。

    Args:
        database: 数据库（用于读取签名密钥）。
        user: 用户。
        ttl_hours: 有效期（小时）。

    Returns:
        (令牌, 过期时间戳)。
    """
    secret = database.ensure_secret()
    expired_at = int(time.time()) + ttl_hours * 3600
    payload = {
        TOKEN_USERNAME: user.username,
        TOKEN_ROLE: user.role,
        TOKEN_VERSION: user.token_version,
        TOKEN_EXPIRED_AT: expired_at,
    }
    body = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{body}.{signature}", expired_at


def decode_token(database: Database, token: str) -> Optional[TokenPayload]:
    """校验并解析令牌。

    Args:
        database: 数据库（用于读取签名密钥）。
        token: 令牌字符串。

    Returns:
        令牌载荷；无效或过期时返回 None。
    """
    if not token or "." not in token:
        return None
    body, _, signature = token.partition(".")
    secret = database.ensure_secret()
    expected = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    try:
        payload = json.loads(_b64decode(body))
    except (ValueError, json.JSONDecodeError):
        return None
    expired_at = int(payload.get(TOKEN_EXPIRED_AT, 0))
    if expired_at <= int(time.time()):
        return None
    return TokenPayload(
        username=str(payload.get(TOKEN_USERNAME, "")),
        role=str(payload.get(TOKEN_ROLE, "user")),
        token_version=int(payload.get(TOKEN_VERSION, 0)),
        expired_at=expired_at,
    )


def authenticate(database: Database, username: str, password: str) -> Optional[User]:
    """校验账号密码。

    Args:
        database: 数据库。
        username: 登录名。
        password: 明文密码。

    Returns:
        用户对象；校验失败时返回 None。
    """
    user = database.get_user(username)
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
