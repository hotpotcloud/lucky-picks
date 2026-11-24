"""回测接口（鉴权后访问）。"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, Request

from app.backtest.service import run_backtest
from app.common.enums import GameId, Strategy
from app.common.exceptions import GameNotFound
from app.common.response import ok_response
from app.db.database import Database
from app.dependencies import get_current_user, get_database
from app.games.config import get_game

router = APIRouter(prefix="/api/v1/backtest", tags=["backtest"])


@router.get("/{game}", summary="策略回测", description="walk-forward 回测并与随机基线对比")
def backtest(
    game: str,
    request: Request,
    strategy: Strategy = Query(default=Strategy.BALANCED),
    window: int = Query(default=100, ge=10, le=300),
    draws: int = Query(default=50, ge=10, le=300),
    tickets: int = Query(default=5, ge=1, le=10),
    seed: Optional[int] = None,
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """执行回测。

    Args:
        game: 玩法标识。
        request: 请求对象。
        strategy: 策略。
        window: 统计窗口。
        draws: 评估期数。
        tickets: 每期注数。
        seed: 随机种子。
        database: 数据库。
        _user: 登录用户。

    Returns:
        统一响应结构。
    """
    try:
        game_id = GameId(game)
    except ValueError as error:
        raise GameNotFound(game) from error
    records = database.all_draws(game_id.value)
    result = run_backtest(
        records,
        get_game(game_id.value),
        strategy.value,
        window,
        tickets,
        draws,
        seed,
    )
    return ok_response(result, request)
