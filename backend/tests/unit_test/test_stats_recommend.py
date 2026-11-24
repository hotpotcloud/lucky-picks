"""统计与推荐单测。"""

from app.db.database import Database
from app.games.config import get_game
from app.recommend.service import recommend
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
