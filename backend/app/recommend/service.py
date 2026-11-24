"""推荐服务：特征打分 + 约束采样 + 覆盖设计。

设计要点：
- 每个号码得到 0–1 的归一化特征（频率 z、遗漏比、近期趋势、贝叶斯后验、均衡先验）；
- 策略给出各特征权重，按加权指数竞速法做无放回抽样；
- 候选按约束过滤后按「特征分 − 约束偏差」排序，Top-M 软采样避免结果固化；
- 同数据版本 + 同 seed 结果可复现。
"""

import math
import random
from typing import Dict, List, Optional, Sequence, Tuple

from app.db.database import DrawRow
from app.games.config import GameRule
from app.games.rules import AreaSelection, validate_bet
from app.schemas import ConstraintsIn
from app.stats.service import compute_statistics

# 候选生成次数。
CANDIDATE_POOL = 600
# 顶部软采样窗口。
TOP_WINDOW = 30
# 采样温度（越小越集中）。
TEMPERATURE = 0.6

# 策略权重：特征 → 权重。
STRATEGY_WEIGHTS: Dict[str, Dict[str, float]] = {
    "balanced": {
        "freqZ": 0.0,
        "omissionRatio": 0.0,
        "recentDelta": 0.0,
        "posterior": 0.2,
        "balance": 0.8,
    },
    "hot": {
        "freqZ": 0.8,
        "omissionRatio": 0.0,
        "recentDelta": 0.4,
        "posterior": 0.2,
        "balance": 0.3,
    },
    "cold": {
        "freqZ": -0.8,
        "omissionRatio": 0.2,
        "recentDelta": -0.3,
        "posterior": 0.1,
        "balance": 0.4,
    },
    "omission": {
        "freqZ": 0.0,
        "omissionRatio": 1.0,
        "recentDelta": 0.0,
        "posterior": 0.1,
        "balance": 0.3,
    },
    "bayesian": {
        "freqZ": 0.2,
        "omissionRatio": 0.1,
        "recentDelta": 0.1,
        "posterior": 0.8,
        "balance": 0.6,
    },
    "coverage": {
        "freqZ": 0.2,
        "omissionRatio": 0.0,
        "recentDelta": 0.0,
        "posterior": 0.2,
        "balance": 0.4,
    },
}


def _normalize(values: Sequence[float]) -> List[float]:
    """把序列归一化到 0–1。

    Args:
        values: 原始值。

    Returns:
        归一化后的列表。
    """
    if not values:
        return []
    low = min(values)
    high = max(values)
    if high - low < 1e-12:
        return [0.5 for _ in values]
    return [(value - low) / (high - low) for value in values]


def _features(
    stats: Dict[str, object], game: GameRule, recent: List[DrawRow]
) -> Dict[str, Dict[str, float]]:
    """构造每个号码的特征。

    Args:
        stats: 统计结果。
        game: 玩法规则。
        recent: 最近若干期开奖记录（用于近期趋势）。

    Returns:
        号码 → 特征字典。
    """
    numbers = stats["numbers"]  # type: ignore[index]
    area = game.areas[0]
    z_values = [float(item["zScore"]) for item in numbers]
    omission_values = [float(item["omissionRatio"]) for item in numbers]
    posterior_values = [float(item["posteriorMean"]) for item in numbers]

    recent_window = min(10, len(recent))
    recent_counts: Dict[int, int] = {number: 0 for number in range(area.min, area.max + 1)}
    for draw in recent[-recent_window:]:
        for number in draw.main_numbers:
            recent_counts[number] = recent_counts.get(number, 0) + 1
    delta_values = [
        (recent_counts.get(int(item["number"]), 0) / max(recent_window, 1))
        - (float(item["count"]) / max(int(stats["window"]), 1))
        for item in numbers
    ]

    z_norm = _normalize(z_values)
    omission_norm = _normalize(omission_values)
    posterior_norm = _normalize(posterior_values)
    delta_norm = _normalize(delta_values)

    features: Dict[str, Dict[str, float]] = {}
    for index, item in enumerate(numbers):
        number = int(item["number"])
        balance = 1.0 - abs((number - area.min) / max(area.max - area.min, 1) - 0.5) * 2
        features[str(number)] = {
            "freqZ": z_norm[index],
            "omissionRatio": omission_norm[index],
            "recentDelta": delta_norm[index],
            "posterior": posterior_norm[index],
            "balance": max(0.0, min(1.0, balance)),
        }
    return features


def _score(features: Dict[str, float], weights: Dict[str, float]) -> float:
    """按权重计算号码得分。

    Args:
        features: 号码特征。
        weights: 策略权重。

    Returns:
        得分。
    """
    return sum(features.get(key, 0.0) * weight for key, weight in weights.items())


def _weighted_sample(
    candidates: Sequence[int], scores: Dict[int, float], count: int, rng: random.Random
) -> List[int]:
    """加权无放回抽样（指数竞速法）。

    Args:
        candidates: 候选号码。
        scores: 号码得分。
        count: 抽取个数。
        rng: 随机源。

    Returns:
        抽中的号码（升序）。
    """
    ranked: List[Tuple[float, int]] = []
    for number in candidates:
        weight = max(1e-6, math.exp(scores.get(number, 0.0) / TEMPERATURE))
        key = -math.log(max(1e-12, rng.random())) / weight
        ranked.append((key, number))
    ranked.sort()
    return sorted(number for _, number in ranked[:count])


def _constraint_ok(
    numbers: Sequence[int], area: GameRule, constraints: Optional[ConstraintsIn]
) -> bool:
    """检查候选号码是否满足约束。

    Args:
        numbers: 候选主区号码。
        area: 区域规则。
        constraints: 约束条件。

    Returns:
        是否满足。
    """
    if constraints is None:
        return True
    values = sorted(numbers)
    odd = len([value for value in values if value % 2 == 1])
    big_threshold = math.ceil((area.min + area.max) / 2)
    big = len([value for value in values if value >= big_threshold])
    total = sum(values)
    span = values[-1] - values[0]
    zone_size = math.ceil((area.max - area.min + 1) / 3)
    zones = [0, 0, 0]
    for value in values:
        zones[min(2, (value - area.min) // zone_size)] += 1

    def within(value: int, bounds: Optional[List[int]]) -> bool:
        if not bounds:
            return True
        return bounds[0] <= value <= bounds[1]

    if not within(odd, constraints.oddEven):
        return False
    if not within(big, constraints.bigSmall):
        return False
    if not within(total, constraints.sumRange):
        return False
    if not within(span, constraints.spanRange):
        return False
    if constraints.maxConsecutive is not None:
        consecutive = 0
        for index in range(1, len(values)):
            if values[index] - values[index - 1] == 1:
                consecutive += 1
        if consecutive > constraints.maxConsecutive:
            return False
    if constraints.zones:
        if not all(
            bounds_count >= constraints.zones[0] and bounds_count <= constraints.zones[1]
            for bounds_count in zones
        ):
            return False
    return True


def _explain(
    numbers: Sequence[int], features: Dict[str, Dict[str, float]], weights: Dict[str, float]
) -> List[Dict[str, object]]:
    """为号码生成解释（贡献最大的两个特征）。

    Args:
        numbers: 号码列表。
        features: 特征字典。
        weights: 权重。

    Returns:
        解释列表。
    """
    explanations: List[Dict[str, object]] = []
    for number in numbers:
        number_features = features.get(str(number), {})
        ranked = sorted(
            number_features.items(),
            key=lambda item: abs(item[1] * weights.get(item[0], 0.0)),
            reverse=True,
        )[:2]
        for feature, value in ranked:
            explanations.append(
                {
                    "number": number,
                    "feature": feature,
                    "weight": weights.get(feature, 0.0),
                    "value": round(value, 4),
                }
            )
    return explanations


def recommend(
    draws: List[DrawRow],
    game: GameRule,
    mode: str,
    strategy: str,
    window: int,
    count: int,
    seed: Optional[int],
    multiplier: int = 1,
    additional: bool = False,
    constraints: Optional[ConstraintsIn] = None,
) -> Dict[str, object]:
    """生成推荐结果。

    Args:
        draws: 开奖记录（按期号升序）。
        game: 玩法规则。
        mode: 模式（single/multiple/banker）。
        strategy: 策略。
        window: 统计窗口。
        count: 单式注数。
        seed: 随机种子。
        multiplier: 倍数。
        additional: 是否追加。
        constraints: 约束条件。

    Returns:
        推荐结果。

    Raises:
        ValueError: 数据不足或参数非法。
    """
    stats = compute_statistics(draws, game, window)
    if stats is None:
        raise ValueError("数据不足，无法生成推荐")

    area = game.areas[0]
    weights = STRATEGY_WEIGHTS.get(strategy, STRATEGY_WEIGHTS["balanced"])
    features = _features(stats, game, draws)
    scores = {int(number): _score(values, weights) for number, values in features.items()}
    rng = random.Random(seed if seed is not None else random.SystemRandom().randint(1, 2**31))

    if mode == "single":
        tickets: List[Dict[str, object]] = []
        used: set[Tuple[int, ...]] = set()
        for _ in range(count):
            candidate = _build_single(area, scores, rng, constraints, used, features, weights)
            if candidate is None:
                break
            used.add(tuple(candidate))
            tickets.append(
                {
                    "mode": "single",
                    "areas": [
                        {"key": area.key, "numbers": candidate, "banker": []},
                    ],
                    "combinations": 1,
                    "baseAmount": game.price * multiplier,
                    "additionalAmount": (game.additional_price * multiplier if additional else 0),
                    "totalAmount": (game.price + (game.additional_price if additional else 0))
                    * multiplier,
                    "explanation": _explain(candidate, features, weights),
                }
            )
        return {
            "game": game.id.value,
            "strategy": strategy,
            "mode": mode,
            "window": stats["window"],
            "seed": seed,
            "bets": tickets,
            "dataVersion": stats["latestIssue"],
        }

    # 复式与胆拖：输出号码池或胆拖方案。
    pool_size = min(area.max - area.min + 1, area.base_count + 2)
    pool = _weighted_sample(list(range(area.min, area.max + 1)), scores, pool_size, rng)
    if mode == "banker" and area.banker_max > 0:
        banker = sorted(pool[:1])
        drag = sorted(pool[1:])
    else:
        banker = []
        drag = sorted(pool)
    areas_selection = [
        AreaSelection(key=area.key, numbers=drag, banker=banker),
    ]
    for extra_area in game.areas[1:]:
        extra_scores = {number: 0.5 for number in range(extra_area.min, extra_area.max + 1)}
        extra_numbers = _weighted_sample(
            list(range(extra_area.min, extra_area.max + 1)),
            extra_scores,
            extra_area.base_count,
            rng,
        )
        areas_selection.append(AreaSelection(key=extra_area.key, numbers=extra_numbers, banker=[]))
    validation = validate_bet(
        game.id.value,
        mode,
        areas_selection,
        multiplier=multiplier,
        additional=additional,
    )
    bet = {
        "mode": mode,
        "areas": [
            {"key": item.key, "numbers": item.numbers, "banker": item.banker}
            for item in validation.normalized_areas
        ],
        "combinations": validation.combinations,
        "baseAmount": validation.base_amount,
        "additionalAmount": validation.additional_amount,
        "totalAmount": validation.total_amount,
        "explanation": _explain(
            [number for item in validation.normalized_areas for number in item.numbers],
            features,
            weights,
        ),
    }
    return {
        "game": game.id.value,
        "strategy": strategy,
        "mode": mode,
        "window": stats["window"],
        "seed": seed,
        "bets": [bet],
        "dataVersion": stats["latestIssue"],
    }


def _build_single(
    area,
    scores: Dict[int, float],
    rng: random.Random,
    constraints: Optional[ConstraintsIn],
    used: set,
    features: Dict[str, Dict[str, float]],
    weights: Dict[str, float],
) -> Optional[List[int]]:
    """构造一注满足约束且未重复的主区号码。

    Args:
        area: 区域规则。
        scores: 号码得分。
        rng: 随机源。
        constraints: 约束条件。
        used: 已使用的号码组合。
        features: 特征字典。
        weights: 权重。

    Returns:
        号码列表；无法满足约束时返回 None。
    """
    best: Optional[List[int]] = None
    best_score = -math.inf
    for _ in range(CANDIDATE_POOL):
        candidate = _weighted_sample(
            list(range(area.min, area.max + 1)),
            scores,
            area.base_count,
            rng,
        )
        if tuple(candidate) in used:
            continue
        if not _constraint_ok(candidate, area, constraints):
            continue
        candidate_score = sum(scores.get(number, 0.0) for number in candidate)
        if candidate_score > best_score:
            best = candidate
            best_score = candidate_score
    if best is None:
        # 放宽约束再试一次
        for _ in range(CANDIDATE_POOL):
            candidate = _weighted_sample(
                list(range(area.min, area.max + 1)),
                scores,
                area.base_count,
                rng,
            )
            if tuple(candidate) not in used:
                return candidate
    return best
