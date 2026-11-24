"""玩法规则配置。

规则按官方公开规则整理（核对日期 2026-11-23）：
- 红蓝玩法：红区 1–33 选 6、蓝区 1–16 选 1，2 元/注；
  复式红区 ≥7、蓝区 ≥2；胆拖红胆 1–5 且胆+拖 ≥7；倍数 1–99；单票 ≤ 20000 元。
- 前后玩法：前区 1–35 选 5、后区 1–12 选 2，基本 2 元/注、追加 +1 元/注；
  复式前区 ≥6、后区 ≥3；胆拖前胆 1–4（胆+拖 ≥6）、后胆 1（拖 ≥2）；倍数 1–99；
  基本单票 ≤ 20000 元，含追加 ≤ 30000 元。
"""

from dataclasses import dataclass
from typing import Dict, Tuple

from app.common.enums import GameId


@dataclass(frozen=True)
class AreaRule:
    """号码区域规则。

    Attributes:
        key: 区域标识。
        label: 展示名称。
        min: 最小编号（含）。
        max: 最大编号（含）。
        base_count: 单注基础号码个数。
        banker_min: 允许的胆码数量下限（0 表示不支持胆码）。
        banker_max: 允许的胆码数量上限。
        color: 展示颜色语义。
    """

    key: str
    label: str
    min: int
    max: int
    base_count: int
    banker_min: int = 0
    banker_max: int = 0
    color: str = "red"


@dataclass(frozen=True)
class GameRule:
    """玩法完整规则。

    Attributes:
        id: 玩法标识。
        name: 玩法名称。
        description: 规则说明。
        price: 基本单价（元/注）。
        additional_price: 追加单价（元/注），0 表示不支持追加。
        multiplier_min: 倍数下限（1 表示不倍投）。
        multiplier_max: 倍数上限。
        base_amount_limit: 基本投注金额上限（元）。
        total_amount_limit: 含追加的总金额上限（元）。
        areas: 号码区域规则。
    """

    id: GameId
    name: str
    description: str
    price: int
    additional_price: int
    multiplier_min: int
    multiplier_max: int
    base_amount_limit: int
    total_amount_limit: int
    areas: Tuple[AreaRule, ...]


RED_BLUE = GameRule(
    id=GameId.RED_BLUE,
    name="红蓝玩法",
    description="红球 1–33 选 6 个，蓝球 1–16 选 1 个，每注 2 元。",
    price=2,
    additional_price=0,
    multiplier_min=1,
    multiplier_max=99,
    base_amount_limit=20000,
    total_amount_limit=20000,
    areas=(
        AreaRule(key="red", label="红球", min=1, max=33, base_count=6, banker_min=1, banker_max=5),
        AreaRule(key="blue", label="蓝球", min=1, max=16, base_count=1),
    ),
)

FRONT_BACK = GameRule(
    id=GameId.FRONT_BACK,
    name="前后玩法",
    description="前区 1–35 选 5 个，后区 1–12 选 2 个，每注 2 元，可追加每注加 1 元。",
    price=2,
    additional_price=1,
    multiplier_min=1,
    multiplier_max=99,
    base_amount_limit=20000,
    total_amount_limit=30000,
    areas=(
        AreaRule(
            key="front", label="前区", min=1, max=35, base_count=5, banker_min=1, banker_max=4
        ),
        AreaRule(key="back", label="后区", min=1, max=12, base_count=2, banker_min=1, banker_max=1),
    ),
)

# 全部玩法规则，key 为玩法标识。
GAMES: Dict[GameId, GameRule] = {rule.id: rule for rule in (RED_BLUE, FRONT_BACK)}

# 玩法标识顺序（用于接口返回与前端切换）。
GAME_ORDER = (GameId.RED_BLUE, GameId.FRONT_BACK)


def get_game(game_id: str) -> GameRule:
    """按标识获取玩法规则。

    Args:
        game_id: 玩法标识。

    Returns:
        玩法规则。

    Raises:
        GameNotFound: 标识不存在时抛出。
    """
    from app.common.exceptions import GameNotFound

    try:
        return GAMES[GameId(game_id)]
    except (ValueError, KeyError) as error:
        raise GameNotFound(game_id) from error
