"""回测服务：walk-forward 评估策略与随机基线。

对每一期目标数据，只使用其之前的数据生成号码，再与目标期对比命中奖级，
避免「用未来数据回测」的常见错误。
"""

import random
from typing import Dict, List, Optional

from app.db.database import DrawRow
from app.games.config import GameRule
from app.games.prizes import evaluate
from app.recommend.service import recommend
from app.schemas import ConstraintsIn

# 最少评估期数（低于该值不下结论）。
MIN_SAMPLE = 20


def _sample_uniform(area_min: int, area_max: int, count: int, rng: random.Random) -> List[int]:
    """均匀随机抽取号码（随机基线）。

    Args:
        area_min: 最小编号。
        area_max: 最大编号。
        count: 抽取个数。
        rng: 随机源。

    Returns:
        升序号码列表。
    """
    return sorted(rng.sample(range(area_min, area_max + 1), count))


def _hit_count(ticket: List[int], drawn: List[int]) -> int:
    """统计命中个数。

    Args:
        ticket: 投注号码。
        drawn: 开奖号码。

    Returns:
        命中个数。
    """
    return len(set(ticket) & set(drawn))


def run_backtest(
    draws: List[DrawRow],
    game: GameRule,
    strategy: str,
    window: int,
    tickets_per_draw: int,
    target_draws: int,
    seed: Optional[int] = None,
    constraints: Optional[ConstraintsIn] = None,
) -> Dict[str, object]:
    """执行回测。

    Args:
        draws: 开奖记录（按期号升序）。
        game: 玩法规则。
        strategy: 策略。
        window: 统计窗口。
        tickets_per_draw: 每期生成注数。
        target_draws: 评估期数。
        seed: 随机种子。
        constraints: 约束条件。

    Returns:
        回测结果。
    """
    area = game.areas[0]
    extra_area = game.areas[1]
    rng = random.Random(seed if seed is not None else 20260101)

    total = len(draws)
    start = max(window, 10)
    targets = draws[-target_draws:] if target_draws < total - start else draws[start:]
    if not targets:
        return {
            "game": game.id.value,
            "strategy": strategy,
            "window": window,
            "draws": 0,
            "sampleEnough": False,
            "strategySummary": _summary(0, 0, {}, 0),
            "baseline": _summary(0, 0, {}, 0),
            "confidence": {"lower": 0.0, "upper": 0.0, "level": 0.95},
            "series": [],
            "methodology": "历史回测仅用于比较策略差异，不代表未来结果。",
            "prizeEstimated": True,
        }

    strategy_invested = 0
    strategy_returned = 0
    strategy_hits = 0
    strategy_prizes: Dict[str, int] = {}
    baseline_invested = 0
    baseline_returned = 0
    baseline_hits = 0
    baseline_prizes: Dict[str, int] = {}
    series: List[Dict[str, object]] = []
    cumulative_returned = 0
    cumulative_invested = 0

    for offset, target in enumerate(targets):
        history = draws[: total - len(targets) + offset]
        if len(history) < start:
            continue
        try:
            result = recommend(
                history,
                game,
                "single",
                strategy,
                window,
                tickets_per_draw,
                seed=seed + offset if seed is not None else None,
                constraints=constraints,
            )
        except ValueError:
            continue

        for bet in result["bets"]:  # type: ignore[index]
            areas = bet["areas"]  # type: ignore[index]
            main_numbers = areas[0]["numbers"]
            extra_numbers = areas[1]["numbers"] if len(areas) > 1 else []
            main_hit = _hit_count(main_numbers, target.main_numbers)
            extra_hit = _hit_count(extra_numbers, target.extra_numbers)
            prize = evaluate(game.id.value, main_hit, extra_hit)
            strategy_invested += int(game.price)
            if prize is not None:
                strategy_hits += 1
                strategy_returned += prize[1]
                strategy_prizes[prize[0]] = strategy_prizes.get(prize[0], 0) + 1

            baseline_main = _sample_uniform(area.min, area.max, area.base_count, rng)
            baseline_extra = _sample_uniform(
                extra_area.min, extra_area.max, extra_area.base_count, rng
            )
            baseline_invested += int(game.price)
            baseline_prize = evaluate(
                game.id.value,
                _hit_count(baseline_main, target.main_numbers),
                _hit_count(baseline_extra, target.extra_numbers),
            )
            if baseline_prize is not None:
                baseline_hits += 1
                baseline_returned += baseline_prize[1]
                baseline_prizes[baseline_prize[0]] = baseline_prizes.get(baseline_prize[0], 0) + 1

        cumulative_invested = strategy_invested
        cumulative_returned = strategy_returned
        series.append(
            {
                "issue": target.issue,
                "invested": strategy_invested,
                "returned": strategy_returned,
                "cumulativeRoi": (
                    (cumulative_returned - cumulative_invested) / cumulative_invested
                    if cumulative_invested
                    else 0.0
                ),
            }
        )

    return {
        "game": game.id.value,
        "strategy": strategy,
        "window": window,
        "draws": len(series),
        "sampleEnough": len(series) >= MIN_SAMPLE,
        "strategySummary": _summary(
            strategy_invested, strategy_returned, strategy_prizes, strategy_hits
        ),
        "baseline": _summary(baseline_invested, baseline_returned, baseline_prizes, baseline_hits),
        "confidence": _confidence(
            strategy_hits, strategy_invested, baseline_hits, baseline_invested
        ),
        "series": series,
        "methodology": (
            "回测按 walk-forward 进行：评估第 t 期时只使用第 t 期之前的数据；"
            "随机基线使用同样注数与同样的评估期数。"
        ),
        "prizeEstimated": True,
    }


def _summary(invested: int, returned: int, prizes: Dict[str, int], hits: int) -> Dict[str, object]:
    """构造汇总指标。

    Args:
        invested: 投入金额。
        returned: 回报金额。
        prizes: 奖级命中次数。
        hits: 命中注数。

    Returns:
        汇总字典。
    """
    tickets = invested // 2 if invested else 0
    return {
        "tickets": tickets,
        "invested": invested,
        "returned": returned,
        "roi": ((returned - invested) / invested) if invested else 0.0,
        "hitRate": (hits / tickets) if tickets else 0.0,
        "prizeCounts": prizes,
    }


def _confidence(
    strategy_hits: int, strategy_invested: int, baseline_hits: int, baseline_invested: int
) -> Dict[str, float]:
    """计算命中率差值的近似 95% 区间。

    Args:
        strategy_hits: 策略命中注数。
        strategy_invested: 策略投入金额。
        baseline_hits: 基线命中注数。
        baseline_invested: 基线投入金额。

    Returns:
        区间字典。
    """
    strategy_tickets = strategy_invested // 2 if strategy_invested else 0
    baseline_tickets = baseline_invested // 2 if baseline_invested else 0
    if not strategy_tickets or not baseline_tickets:
        return {"lower": 0.0, "upper": 0.0, "level": 0.95}
    p1 = strategy_hits / strategy_tickets
    p2 = baseline_hits / baseline_tickets
    difference = p1 - p2
    standard_error = (p1 * (1 - p1) / strategy_tickets + p2 * (1 - p2) / baseline_tickets) ** 0.5
    margin = 1.96 * standard_error
    return {
        "lower": difference - margin,
        "upper": difference + margin,
        "level": 0.95,
    }
