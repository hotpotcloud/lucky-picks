"""服务元信息接口。"""

from typing import Any

from fastapi import APIRouter, Depends, Request

from app.common.response import ok_response
from app.db.database import Database
from app.dependencies import get_current_user, get_database
from app.draws.service import data_meta
from app.games.config import GAME_ORDER

router = APIRouter(prefix="/api/v1/meta", tags=["meta"])


@router.get("", summary="数据版本与来源", description="返回每个玩法的数据版本与已存期数")
def meta(
    request: Request,
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """返回数据元信息。

    Args:
        request: 请求对象。
        database: 数据库。
        _user: 登录用户。

    Returns:
        统一响应结构。
    """
    return ok_response(
        {game_id.value: data_meta(database, game_id.value) for game_id in GAME_ORDER},
        request,
    )
