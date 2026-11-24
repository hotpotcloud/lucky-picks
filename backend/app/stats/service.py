"""统计服务：频率、冷热、遗漏、分布指标与均匀性检验。

公式说明见 docs/features/FEAT-002/research-algorithms.md。
"""

import math
from typing import Dict, List, Optional, Sequence

from app.db.database import DrawRow
from app.games.config import AreaRule, GameRule

# 贝叶斯平滑的均匀先验参数。
PRIOR_ALPHA = 1.0
PRIOR_BETA = 1.0


def _chi_square_sf(x: float, k: int) -> float:
    """卡方分布生存函数（正则化不完全伽马函数 Q(k/2, x/2)）。

    使用级数展开与连分式两种数值方法，避免引入 SciPy 依赖。

    Args:
        x: 卡方统计量。
        k: 自由度。

    Returns:
        p 值（0–1）。
    """
    if x <= 0:
        return 1.0
    a = k / 2.0
    value = x / 2.0
    if value < a + 1.0:
        # 级数展开
        term = 1.0 / a
        total = term
        for index in range(1, 500):
            term *= value / (a + index)
            total += term
            if abs(term) < abs(total) * 1e-12:
                break
        lower = total * math.exp(-value + a * math.log(value) - math.lgamma(a))
        return max(0.0, min(1.0, 1.0 - lower))
    # 连分式
    tiny = 1e-300
    b = value + 1.0 - a
    c = 1.0 / tiny
    d = 1.0 / b
    h = d
    for index in range(1, 500):
        an = -index * (index - a)
        b += 2.0
        d = an * d + b
        if abs(d) < tiny:
            d = tiny
        c = b + an / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 1e-12:
            break
    upper = math.exp(-value + a * math.log(value) - math.lgamma(a)) * h
    return max(0.0, min(1.0, upper))


def number_statistics(
    numbers: Sequence[int], area: AreaRule, window_size: int
) -> List[Dict[str, float]]:
    """计算每个号码的频率与遗漏指标。

    Args:
        numbers: 按时间升序排列的主区号码列表（每期一个列表）。
        area: 区域规则。
        window_size: 统计窗口期数。

    Returns:
        每个号码的指标列表。
    """
    span = area.max - area.min + 1
    probability = area.base_count / span
    expected_count = window_size * probability
    variance = window_size * probability * (1 - probability)
    deviation = math.sqrt(variance) if variance > 0 else 1.0
    expected_gap = 1.0 / probability if probability > 0 else 0.0

    counts = {number: 0 for number in range(area.min, area.max + 1)}
    last_seen: Dict[int, int] = {}
    gaps: Dict[int, List[int]] = {number: [] for number in counts}
    previous_occurrence: Dict[int, int] = {}

    for index, draw_numbers in enumerate(numbers):
        for number in set(draw_numbers):
            counts[number] += 1
            if number in previous_occurrence:
                gaps[number].append(index - previous_occurrence[number])
            previous_occurrence[number] = index
            last_seen[number] = index

    last_index = len(numbers) - 1
    result: List[Dict[str, float]] = []
    for number in range(area.min, area.max + 1):
        count = counts[number]
        seen_index = last_seen.get(number)
        current_omission = 0 if seen_index == last_index else (last_index - (seen_index or -1))
        history_gaps = gaps[number]
        average_omission = (
            sum(history_gaps) / len(history_gaps) if history_gaps else float(window_size)
        )
        maximum_omission = max(history_gaps) if history_gaps else current_omission
        posterior_mean = (PRIOR_ALPHA + count) / (PRIOR_ALPHA + PRIOR_BETA + window_size)
        result.append(
            {
                "number": number,
                "count": float(count),
                "frequency": count / window_size if window_size else 0.0,
                "expectedCount": expected_count,
                "zScore": (count - expected_count) / deviation,
                "currentOmission": float(current_omission),
                "maxOmission": float(maximum_omission),
                "avgOmission": average_omission,
                "expectedGap": expected_gap,
                "omissionRatio": (current_omission / expected_gap) if expected_gap else 0.0,
                "posteriorMean": posterior_mean,
            }
        )
    return result


def draw_metrics(draw_numbers: Sequence[int], area: AreaRule) -> Dict[str, object]:
    """计算单期的形态指标。

    Args:
        draw_numbers: 一期的主区号码。
        area: 区域规则。

    Returns:
        指标字典。
    """
    values = sorted(draw_numbers)
    total = sum(values)
    span = values[-1] - values[0] if values else 0
    odd = len([value for value in values if value % 2 == 1])
    big_threshold = math.ceil((area.min + area.max) / 2)
    big = len([value for value in values if value >= big_threshold])
    zone_size = math.ceil((area.max - area.min + 1) / 3)
    zones = [0, 0, 0]
    for value in values:
        zones[min(2, (value - area.min) // zone_size)] += 1
    consecutive = 0
    for index in range(1, len(values)):
        if values[index] - values[index - 1] == 1:
            consecutive += 1
    differences = {values[index] - values[index - 1] for index in range(1, len(values))}
    ac_value = len(differences) - (len(values) - 1)
    return {
        "sum": total,
        "span": span,
        "oddEven": f"{odd}:{len(values) - odd}",
        "bigSmall": f"{big}:{len(values) - big}",
        "zones": ":".join(str(count) for count in zones),
        "acValue": ac_value,
        "consecutive": consecutive,
    }


def compute_statistics(
    draws: List[DrawRow], game: GameRule, window: int
) -> Optional[Dict[str, object]]:
    """计算统计结果。

    Args:
        draws: 开奖记录（按期号升序）。
        game: 玩法规则。
        window: 统计窗口。

    Returns:
        统计结果；数据不足时返回 None。
    """
    if not draws:
        return None
    area = game.areas[0]
    selected = draws[-window:] if window < len(draws) else draws
    main_numbers = [draw.main_numbers for draw in selected]
    stats = number_statistics(main_numbers, area, len(selected))
    metrics = [draw_metrics(numbers, area) for numbers in main_numbers]

    counts = [int(item["count"]) for item in stats]
    expected = stats[0]["expectedCount"] if stats else 0.0
    chi_square = sum((count - expected) ** 2 / expected for count in counts) if expected else 0.0
    degrees = len(counts) - 1
    p_value = _chi_square_sf(chi_square, degrees) if degrees > 0 else 1.0
    conclusion = (
        "历史分布与均匀分布无显著差异"
        if p_value > 0.05
        else "历史分布与均匀分布存在显著偏离，但不代表下一期结果"
    )

    return {
        "game": game.id.value,
        "window": len(selected),
        "numbers": stats,
        "drawMetrics": metrics,
        "uniformity": {
            "chiSquare": chi_square,
            "degreesOfFreedom": degrees,
            "pValue": p_value,
            "conclusion": conclusion,
        },
        "latestIssue": selected[-1].issue,
        "latestDate": selected[-1].draw_date,
    }
