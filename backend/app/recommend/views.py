"""投注校验与推荐接口（鉴权后访问）。"""

from typing import Any

from fastapi import APIRouter, Depends, Request

from app.common.exceptions import InvalidSelection
from app.common.response import ok_response
from app.db.database import Database
from app.dependencies import get_current_user, get_database
from app.games.config import get_game
from app.games.rules import AreaSelection, ValidationResult, validate_bet
from app.recommend.service import recommend
from app.schemas import BetSelectionIn, RecommendationIn

router = APIRouter(prefix="/api/v1", tags=["bets", "recommendations"])


@router.post("/bets/validate", summary="校验投注方案", description="计算注数与金额，返回校验错误")
def validate(
    payload: BetSelectionIn,
    request: Request,
    _user: Any = Depends(get_current_user),
) -> Any:
    """校验投注方案。

    Args:
        payload: 投注方案。
        request: 请求对象。
        _user: 登录用户。

    Returns:
        统一响应结构（校验失败也通过 data.valid 表达）。
    """
    areas = [
        AreaSelection(key=area.key, numbers=area.numbers, banker=area.banker)
        for area in payload.areas
    ]
    result: ValidationResult = validate_bet(
        payload.game,
        payload.mode,
        areas,
        multiplier=payload.multiplier,
        additional=payload.additional,
    )
    return ok_response(result.to_dict(), request)


@router.post("/recommendations", summary="生成推荐号码", description="按策略生成可复现的号码建议")
def create_recommendation(
    payload: RecommendationIn,
    request: Request,
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """生成推荐。

    Args:
        payload: 推荐请求。
        request: 请求对象。
        database: 数据库。
        _user: 登录用户。

    Returns:
        统一响应结构。

    Raises:
        InvalidSelection: 数据不足时抛出。
    """
    game = get_game(payload.game)
    draws = database.all_draws(payload.game)
    if len(draws) < payload.window:
        raise InvalidSelection("历史数据不足，无法按该窗口生成推荐")
    result = recommend(
        draws,
        game,
        payload.mode,
        payload.strategy,
        payload.window,
        payload.count,
        payload.seed,
        multiplier=payload.multiplier,
        additional=payload.additional,
        constraints=payload.constraints,
    )
    return ok_response(result, request)
