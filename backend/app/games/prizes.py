"""奖级判定与奖金表。

固定奖按官方规则；浮动奖（一、二等奖）使用可配置估计值并在结果中标记为估算。
"""

from typing import List, Optional, Tuple

# 奖级名称与奖金（估算值仅用于浮动奖）。
REDBLUE_PRIZES: List[Tuple[str, int, bool]] = [
    ("一等奖", 5_000_000, True),
    ("二等奖", 100_000, True),
    ("三等奖", 3_000, False),
    ("四等奖", 200, False),
    ("五等奖", 10, False),
    ("六等奖", 5, False),
]

FRONTBACK_PRIZES: List[Tuple[str, int, bool]] = [
    ("一等奖", 10_000_000, True),
    ("二等奖", 300_000, True),
    ("三等奖", 10_000, False),
    ("四等奖", 3_000, False),
    ("五等奖", 300, False),
    ("六等奖", 200, False),
    ("七等奖", 100, False),
    ("八等奖", 15, False),
    ("九等奖", 5, False),
]


def prize_table(game: str) -> List[Tuple[str, int, bool]]:
    """获取奖级表。

    Args:
        game: 玩法标识。

    Returns:
        (奖级名称, 奖金, 是否估算) 列表。
    """
    return REDBLUE_PRIZES if game == "redblue" else FRONTBACK_PRIZES


def evaluate(game: str, main_hit: int, extra_hit: int) -> Optional[Tuple[str, int, bool]]:
    """根据命中个数判定奖级。

    Args:
        game: 玩法标识。
        main_hit: 主区命中个数。
        extra_hit: 副区命中个数。

    Returns:
        (奖级名称, 奖金, 是否估算)；未中奖时返回 None。
    """
    if game == "redblue":
        if (main_hit, extra_hit) == (6, 1):
            return REDBLUE_PRIZES[0]
        if (main_hit, extra_hit) == (6, 0):
            return REDBLUE_PRIZES[1]
        if (main_hit, extra_hit) == (5, 1):
            return REDBLUE_PRIZES[2]
        if (main_hit, extra_hit) in {(5, 0), (4, 1)}:
            return REDBLUE_PRIZES[3]
        if (main_hit, extra_hit) in {(4, 0), (3, 1)}:
            return REDBLUE_PRIZES[4]
        if (main_hit, extra_hit) in {(2, 1), (1, 1), (0, 1)}:
            return REDBLUE_PRIZES[5]
        return None

    table = {
        (5, 2): FRONTBACK_PRIZES[0],
        (5, 1): FRONTBACK_PRIZES[1],
        (5, 0): FRONTBACK_PRIZES[2],
        (4, 2): FRONTBACK_PRIZES[3],
        (4, 1): FRONTBACK_PRIZES[4],
        (3, 2): FRONTBACK_PRIZES[5],
        (4, 0): FRONTBACK_PRIZES[6],
        (3, 1): FRONTBACK_PRIZES[7],
        (2, 2): FRONTBACK_PRIZES[7],
        (3, 0): FRONTBACK_PRIZES[8],
        (2, 1): FRONTBACK_PRIZES[8],
        (1, 2): FRONTBACK_PRIZES[8],
        (0, 2): FRONTBACK_PRIZES[8],
    }
    return table.get((main_hit, extra_hit))
