"""鉴权接口：登录、当前用户、退出。"""

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.auth.service import authenticate, issue_token
from app.common.response import error_response, ok_response
from app.db.database import Database
from app.dependencies import get_current_user, get_database
from app.schemas import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", summary="登录", description="使用账号密码换取登录令牌")
def login(
    payload: LoginRequest, request: Request, database: Database = Depends(get_database)
) -> Any:
    """登录并签发令牌。

    Args:
        payload: 登录请求。
        request: 请求对象。
        database: 数据库。

    Returns:
        统一响应结构。
    """
    user = authenticate(database, payload.username, payload.password)
    if user is None:
        return JSONResponse(
            status_code=401,
            content=error_response(40100, "账号或密码不正确", request),
        )
    token, expired_at = issue_token(database, user)
    body = LoginResponse(
        token=token,
        expiredAt=expired_at,
        user=UserOut(id=user.id, username=user.username, role=user.role),
    )
    return ok_response(body.model_dump(), request)


@router.get("/me", summary="当前用户", description="根据令牌返回当前登录用户")
def me(
    request: Request,
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """返回当前登录用户。

    Args:
        request: 请求对象。
        database: 数据库。

    Returns:
        统一响应结构。
    """
    user = getattr(request.state, "user", None)
    if user is None:
        return JSONResponse(
            status_code=401,
            content=error_response(40100, "未登录或令牌已失效", request),
        )
    return ok_response(
        UserOut(id=user.id, username=user.username, role=user.role).model_dump(), request
    )


@router.post("/logout", summary="退出登录", description="使当前账号的全部令牌失效")
def logout(
    request: Request,
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """退出登录（令牌版本递增）。

    Args:
        request: 请求对象。
        database: 数据库。

    Returns:
        统一响应结构。
    """
    user = getattr(request.state, "user", None)
    if user is not None:
        database.bump_token_version(user.username)
    return ok_response({"loggedOut": True}, request)
