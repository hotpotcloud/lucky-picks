"""开奖数据接口（鉴权后访问）。"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, Request

from app.common.enums import GameId
from app.common.exceptions import GameNotFound
from app.common.response import error_response, ok_response
from app.db.database import Database
from app.dependencies import get_current_user, get_database
from app.draws.service import data_meta, latest_draw, list_draws

router = APIRouter(prefix="/api/v1/draws", tags=["draws"])


def _valid_game(game: str) -> str:
    """校验玩法标识。

    Args:
        game: 玩法标识。

    Returns:
        玩法标识。

    Raises:
        GameNotFound: 标识不存在。
    """
    try:
        return GameId(game).value
    except ValueError as error:
        raise GameNotFound(game) from error


@router.get("/{game}", summary="历史开奖分页", description="按期号/日期筛选并分页返回")
def get_draws(
    game: str,
    request: Request,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    issue: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """分页查询开奖记录。

    Args:
        game: 玩法标识。
        request: 请求对象。
        limit: 条数。
        offset: 偏移。
        issue: 期号筛选。
        dateFrom: 起始日期。
        dateTo: 结束日期。
        database: 数据库。
        _user: 登录用户（鉴权依赖）。

    Returns:
        统一响应结构。
    """
    game_id = _valid_game(game)
    records = list_draws(database, game_id, limit, offset, issue, dateFrom, dateTo)
    return ok_response(
        {
            "items": [record.to_dict() for record in records],
            "total": database.count_draws(game_id),
            "limit": limit,
            "offset": offset,
            "meta": data_meta(database, game_id),
        },
        request,
    )


@router.get("/{game}/latest", summary="最新一期", description="返回指定玩法最新开奖")
def get_latest(
    game: str,
    request: Request,
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """查询最新一期。

    Args:
        game: 玩法标识。
        request: 请求对象。
        database: 数据库。
        _user: 登录用户。

    Returns:
        统一响应结构。
    """
    game_id = _valid_game(game)
    record = latest_draw(database, game_id)
    if record is None:
        return error_response(40400, "暂无数据", request)
    return ok_response({"draw": record.to_dict(), "meta": data_meta(database, game_id)}, request)
