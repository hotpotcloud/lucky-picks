"""FastAPI 依赖：数据库实例与登录校验。"""

from typing import Optional

from fastapi import Depends, HTTPException, Request, status

from app.auth.service import decode_token
from app.config.config import settings
from app.db.database import Database, User, create_database

# 进程内共享的数据库实例。
_database: Optional[Database] = None


def init_database(path: Optional[str] = None) -> Database:
    """初始化并返回共享数据库实例。

    Args:
        path: 数据库路径；默认取配置值。

    Returns:
        数据库实例。
    """
    global _database
    if _database is None:
        _database = Database(path, dialect="sqlite") if path else create_database(settings)
    return _database


def get_database() -> Database:
    """FastAPI 依赖：获取数据库。

    Returns:
        数据库实例。
    """
    return init_database()


def get_current_user(request: Request, database: Database = Depends(get_database)) -> User:
    """FastAPI 依赖：解析 Bearer 令牌并返回当前用户。

    Args:
        request: 请求对象。
        database: 数据库。

    Returns:
        当前用户。

    Raises:
        HTTPException: 缺少或无效令牌时返回 401。
    """
    header = request.headers.get("authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    payload = decode_token(database, token) if token else None
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或令牌已失效",
        )
    user = database.get_user(payload.username)
    if user is None or user.token_version != payload.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或令牌已失效",
        )
    request.state.user = user
    return user


def optional_user(request: Request, database: Database = Depends(get_database)) -> Optional[User]:
    """FastAPI 依赖：可选登录（令牌无效时不报错）。

    Args:
        request: 请求对象。
        database: 数据库。

    Returns:
        当前用户；未登录时返回 None。
    """
    header = request.headers.get("authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    payload = decode_token(database, token) if token else None
    if payload is None:
        return None
    user = database.get_user(payload.username)
    if user is None or user.token_version != payload.token_version:
        return None
    request.state.user = user
    return user
