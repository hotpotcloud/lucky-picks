"""AI 分析接口（鉴权后访问）。"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, Query, Request

from app.ai.service import AiAnalysisUnavailable, ai_configured, analyze
from app.common.enums import GameId
from app.common.exceptions import GameNotFound
from app.common.rate_limit import limit_analysis
from app.common.response import error_response, ok_response
from app.db.database import Database
from app.dependencies import get_current_user, get_database
from app.games.config import get_game
from app.stats.service import compute_statistics

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


@router.get("/configured", summary="AI 是否可用", description="返回服务端是否已配置 AI Key")
def configured(
    request: Request,
    _user: Any = Depends(get_current_user),
) -> Any:
    """返回 AI 配置状态。

    Args:
        request: 请求对象。
        _user: 登录用户。

    Returns:
        统一响应结构。
    """
    return ok_response({"available": ai_configured()}, request)


@router.get("/analysis/{game}", summary="AI 统计分析", description="基于历史统计生成中文分析", dependencies=[Depends(limit_analysis)])
def ai_analysis(
    game: str,
    request: Request,
    window: int = Query(default=100, ge=10, le=300),
    session_id: Optional[str] = Header(default=None, alias="x-opencode-session"),
    database: Database = Depends(get_database),
    _user: Any = Depends(get_current_user),
) -> Any:
    """生成 AI 分析。

    Args:
        game: 玩法标识。
        request: 请求对象。
        window: 统计窗口。
        session_id: 会话标识（header）。
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
        return error_response(40400, "暂无数据，无法生成分析", request)

    try:
        result = analyze(stats, session_id=session_id)
    except AiAnalysisUnavailable as error:
        return error_response(50301, error.message, request)

    return ok_response(result, request)
