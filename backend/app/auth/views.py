"""鉴权接口：登录、当前用户、退出。"""

import sqlite3
from typing import Any

import pymysql
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from loguru import logger

from app.auth.service import authenticate, issue_token
from app.common.rate_limit import limit_registration
from app.common.response import error_response, ok_response
from app.db.database import Database, InvalidInvitationError
from app.dependencies import get_current_user, get_database
from app.schemas import LoginRequest, LoginResponse, RegisterRequest, ResetPasswordRequest, UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post(
    "/register",
    summary="邀请注册",
    description="使用一次性邀请码创建普通用户并签发登录令牌",
    dependencies=[Depends(limit_registration)],
)
def register(
    payload: RegisterRequest, request: Request, database: Database = Depends(get_database)
) -> Any:
    """使用一次性邀请码注册普通用户。

    Args:
        payload: 经过格式校验的账号密码。
        request: 请求上下文。
        database: 数据库依赖。

    Returns:
        登录令牌与用户信息；无效邀请返回 400，重复账号返回 409。
    """
    try:
        database.register_user_with_invitation(
            payload.username,
            payload.passwordDigest,
            payload.inviteCode,
        )
    except InvalidInvitationError:
        logger.warning("邀请注册失败：username={} reason=invalid_invitation", payload.username)
        return JSONResponse(
            status_code=400,
            content=error_response(40001, "邀请码无效或已使用，请获取新的邀请码", request),
        )
    except (sqlite3.IntegrityError, pymysql.IntegrityError):
        # 用户唯一键冲突会让同一事务整体回滚，邀请码不会被消耗。
        logger.exception("注册失败：username={}，账号写入冲突", payload.username)
        return JSONResponse(
            status_code=409,
            content=error_response(40900, "账号已存在，请登录或更换账号", request),
        )
    user = database.get_user(payload.username)
    if user is None:
        raise RuntimeError("注册后无法读取用户，请检查数据库连接并重试")
    token, expired_at = issue_token(database, user)
    # 权限由服务端固定为普通用户，不接受客户端传入角色。
    logger.info("注册成功：username={} user_id={} role=user", user.username, user.id)
    return ok_response(LoginResponse(token=token, expiredAt=expired_at, user=UserOut(id=user.id, username=user.username, role=user.role)).model_dump(), request)


@router.post(
    "/invitations",
    summary="生成邀请码",
    description="已登录用户生成一次性注册邀请码",
)
def create_invitation(
    request: Request,
    database: Database = Depends(get_database),
    current_user: Any = Depends(get_current_user),
) -> Any:
    """生成仅返回一次明文的一次性邀请码。

    Args:
        request: 请求上下文。
        database: 数据库依赖。
        current_user: 当前登录用户。

    Returns:
        包含明文邀请码的统一响应。
    """
    code = database.create_invitation(current_user.id)
    # 日志只记录创建人，不记录邀请码明文或摘要。
    logger.info(
        "邀请码创建成功：creator_user_id={} username={}",
        current_user.id,
        current_user.username,
    )
    return ok_response({"code": code}, request)


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
    user = authenticate(database, payload.username, payload.passwordDigest)
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


@router.post(
    "/users/{username}/password",
    summary="管理员重置用户密码",
    description="仅管理员可用；请求只包含密码摘要，不接收明文密码",
)
def reset_user_password(
    username: str,
    payload: ResetPasswordRequest,
    request: Request,
    database: Database = Depends(get_database),
    current_user: Any = Depends(get_current_user),
) -> Any:
    """用摘要重置指定账号密码，并使历史令牌失效。

    Args:
        username: 目标账号。
        payload: 仅包含密码摘要的重置请求。
        request: 请求上下文。
        database: 数据库依赖。
        current_user: 当前登录用户，必须是管理员。

    Returns:
        统一响应；非管理员返回 403，账号不存在返回 404。
    """
    if current_user.role != "admin":
        logger.warning(
            "密码重置被拒绝：operator={} target={} reason=not_admin",
            current_user.username,
            username,
        )
        return JSONResponse(
            status_code=403,
            content=error_response(40300, "仅管理员可以重置密码", request),
        )
    target = database.get_user(username.strip())
    if target is None:
        return JSONResponse(
            status_code=404,
            content=error_response(40400, "账号不存在", request),
        )
    database.set_password_digest(target.username, payload.passwordDigest)
    database.bump_token_version(target.username)
    # 日志只记录操作人、目标账号与结果，不记录摘要或密码。
    logger.info(
        "密码重置成功：operator={} target={} user_id={}",
        current_user.username,
        target.username,
        target.id,
    )
    return ok_response({"reset": True}, request)


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
