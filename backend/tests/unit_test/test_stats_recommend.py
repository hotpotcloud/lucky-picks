"""统计与推荐单测。"""

import pytest

from app.common.exceptions import InvalidSelection
from app.db.database import Database, DrawRow
from app.games.config import get_game
from app.games.rules import AreaSelection, validate_bet
from app.recommend.service import STRATEGY_WEIGHTS, recommend
from app.schemas import ConstraintsIn
from app.stats.service import compute_statistics

WINDOW = 120


def test_statistics(database: Database) -> None:
    """统计结果包含全部号码与卡方检验。"""
    stats = compute_statistics(database.all_draws("redblue"), get_game("redblue"), WINDOW)
    assert stats is not None
    assert len(stats["numbers"]) == 33  # type: ignore[arg-type]
    uniformity = stats["uniformity"]  # type: ignore[index]
    assert 0.0 <= uniformity["pValue"] <= 1.0  # type: ignore[index]


def test_recommendation_reproducible(database: Database) -> None:
    """同 seed 生成结果一致。"""
    draws = database.all_draws("redblue")
    first = recommend(draws, get_game("redblue"), "single", "balanced", WINDOW, 5, seed=42)
    second = recommend(draws, get_game("redblue"), "single", "balanced", WINDOW, 5, seed=42)
    assert first["bets"] == second["bets"]


def test_recommendation_valid(database: Database) -> None:
    """推荐结果号码合法且不重复。"""
    draws = database.all_draws("redblue")
    result = recommend(draws, get_game("redblue"), "single", "hot", WINDOW, 5, seed=7)
    bets = result["bets"]
    assert len(bets) == 5  # type: ignore[arg-type]
    tickets = set()
    for bet in bets:  # type: ignore[union-attr]
        numbers = bet["areas"][0]["numbers"]
        assert len(numbers) == 6
        assert numbers == sorted(set(numbers))
        assert all(1 <= number <= 33 for number in numbers)
        tickets.add(tuple(numbers))
    assert len(tickets) == 5


def test_multiple_recommendation(database: Database) -> None:
    """复式推荐输出号码池且注数正确。"""
    draws = database.all_draws("redblue")
    result = recommend(draws, get_game("redblue"), "multiple", "bayesian", WINDOW, 5, seed=7)
    bet = result["bets"][0]  # type: ignore[index]
    assert bet["combinations"] == 28  # type: ignore[index]


def test_random_strategy_is_explicit_uniform_sampling() -> None:
    """随机策略必须显式等权，不能静默回退为均衡策略。"""
    assert "random" in STRATEGY_WEIGHTS
    assert set(STRATEGY_WEIGHTS["random"].values()) == {0.0}


def _frontback_draws() -> list[DrawRow]:
    """构造前后玩法统计所需的完整测试数据。"""
    return [
        DrawRow(
            game="frontback",
            issue=f"2026{index:04d}",
            draw_date=f"2026-02-{(index % 28) + 1:02d}",
            main_numbers=sorted(
                {
                    ((index * step) % 35) + 1
                    for step in (1, 5, 7, 11, 13)
                }
            ),
            extra_numbers=sorted({(index % 12) + 1, ((index + 5) % 12) + 1}),
            sales=100000,
            pool=1000000,
            source="test",
            fetched_at="2026-11-24T00:00:00+00:00",
        )
        for index in range(1, 121)
    ]


@pytest.mark.parametrize("game_id", ["redblue", "frontback"])
def test_single_recommendation_contains_valid_complete_bets(
    database: Database,
    game_id: str,
) -> None:
    """两种玩法的每注单式推荐都必须包含完整区域并通过投注校验。"""
    draws = database.all_draws("redblue") if game_id == "redblue" else _frontback_draws()
    game = get_game(game_id)
    result = recommend(draws, game, "single", "random", WINDOW, 3, seed=11)

    assert len(result["bets"]) == 3  # type: ignore[arg-type]
    for bet in result["bets"]:  # type: ignore[union-attr]
        assert [area["key"] for area in bet["areas"]] == [area.key for area in game.areas]
        validation = validate_bet(
            game_id,
            "single",
            [
                AreaSelection(
                    key=area["key"],
                    numbers=area["numbers"],
                    banker=area["banker"],
                )
                for area in bet["areas"]
            ],
        )
        assert validation.combinations == 1


def test_exact_constraints_are_satisfied(database: Database) -> None:
    """精确奇偶、大小、和值和三区约束必须全部真实满足。"""
    constraints = ConstraintsIn(
        oddEven=[3, 3],
        bigSmall=[3, 3],
        sumRange=[90, 110],
        zoneCounts=[2, 2, 2],
    )
    result = recommend(
        database.all_draws("redblue"),
        get_game("redblue"),
        "single",
        "random",
        WINDOW,
        1,
        seed=13,
        constraints=constraints,
    )
    numbers = result["bets"][0]["areas"][0]["numbers"]  # type: ignore[index]

    assert sum(number % 2 for number in numbers) == 3
    assert sum(number >= 17 for number in numbers) == 3
    assert 90 <= sum(numbers) <= 110
    assert [
        sum(1 <= number <= 11 for number in numbers),
        sum(12 <= number <= 22 for number in numbers),
        sum(23 <= number <= 33 for number in numbers),
    ] == [2, 2, 2]


@pytest.mark.parametrize(
    ("constraints", "message"),
    [
        (ConstraintsIn(oddEven=[7, 7]), "奇偶数量"),
        (ConstraintsIn(bigSmall=[7, 7]), "大小数量"),
        (ConstraintsIn(sumRange=[1, 1]), "和值范围"),
        (ConstraintsIn(zoneCounts=[3, 3, 3]), "三区数量"),
    ],
)
def test_impossible_constraints_fail_clearly(
    database: Database,
    constraints: ConstraintsIn,
    message: str,
) -> None:
    """玩法层不可实现的约束应立即报错，不能放宽后伪称满足。"""
    with pytest.raises(InvalidSelection, match=message):
        recommend(
            database.all_draws("redblue"),
            get_game("redblue"),
            "single",
            "random",
            WINDOW,
            1,
            seed=17,
            constraints=constraints,
        )
