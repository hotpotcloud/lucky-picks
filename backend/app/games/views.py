"""玩法规则接口（公开）。"""

from typing import Any

from fastapi import APIRouter, Request

from app.common.response import ok_response
from app.games.config import GAME_ORDER, GAMES
from app.games.rules import game_payload

router = APIRouter(prefix="/api/v1/games", tags=["games"])


@router.get("", summary="玩法与规则列表", description="返回全部玩法及投注规则")
def list_games(request: Request) -> Any:
    """返回玩法规则。

    Args:
        request: 请求对象。

    Returns:
        统一响应结构。
    """
    return ok_response([game_payload(GAMES[game_id]) for game_id in GAME_ORDER], request)
