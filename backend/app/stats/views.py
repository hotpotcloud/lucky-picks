"""统计接口（鉴权后访问）。"""

from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.common.enums import GameId
from app.common.exceptions import GameNotFound
from app.common.response import error_response, ok_response
from app.db.database import Database
from app.dependencies import get_current_user, get_database
from app.games.config import get_game
from app.stats.service import compute_statistics

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


@router.get("/{game}", summary="号码与形态统计", description="返回频率、遗漏与分布指标")
def get_stats(
    game: str,
    request: Request,
    window: int = Query(default=100, ge=10, le=300),
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """计算统计结果。

    Args:
        game: 玩法标识。
        request: 请求对象。
        window: 统计窗口。
        database: 数据库。
        _user: 登录用户。

    Returns:
        统一响应结构。
    """
    try:
        game_id = GameId(game)
    except ValueError as error:
        raise GameNotFound(game) from error
    draws = database.all_draws(game_id.value)
    stats = compute_statistics(draws, get_game(game_id.value), window)
    if stats is None:
        return error_response(40400, "暂无数据", request)
    return ok_response(stats, request)
