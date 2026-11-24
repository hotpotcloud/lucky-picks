"""客户端密码摘要协议。

背景：部署环境未启用 HTTPS，直接提交明文密码会让密码暴露在网络链路与
请求日志中。前端在浏览器内计算
`sha256("lucky-picks:v1:" + username + ":" + password)`，后端只接收摘要，
并用 PBKDF2 加盐存储，数据库中不会保存任何可直接登录的明文密码。

注意：本方案可以避免明文密码泄露和跨站密码复用，但摘要本身在无 TLS 的
链路上仍可被窃听重放；生产环境仍应尽快启用 HTTPS。
"""

import hashlib

# 与前端保持一致的摘要前缀，修改时两端必须同步。
DIGEST_PREFIX = "lucky-picks:v1:"

# 摘要固定为 64 位小写十六进制 SHA-256。
DIGEST_LENGTH = 64


def derive_password_digest(username: str, password: str) -> str:
    """计算客户端登录摘要。

    Args:
        username: 登录名（两端统一去除首尾空白）。
        password: 明文密码，仅在浏览器或服务端迁移时短暂存在。

    Returns:
        64 位小写十六进制摘要。
    """
    raw = f"{DIGEST_PREFIX}{username.strip()}:{password}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def is_password_digest(value: str) -> bool:
    """判断字符串是否为合法摘要。

    Args:
        value: 待校验字符串。

    Returns:
        是否为 64 位小写十六进制摘要。
    """
    return len(value) == DIGEST_LENGTH and all(char in "0123456789abcdef" for char in value)
