"""规则引擎单测：全玩法、金额上限与非法参数。"""

from app.games.rules import AreaSelection, validate_bet


def test_redblue_multiple() -> None:
    """红蓝玩法红球复式 8+1：C(8,6)=28 注、56 元。"""
    result = validate_bet(
        "redblue",
        "multiple",
        [
            AreaSelection("red", [1, 2, 3, 4, 5, 6, 7, 8]),
            AreaSelection("blue", [8]),
        ],
    )
    assert result.valid is True
    assert result.combinations == 28
    assert result.total_amount == 56


def test_frontback_additional_multiplier() -> None:
    """前后玩法前区 6+后区 2，追加 2 倍：6 注、基本 24 元、追加 12 元。"""
    result = validate_bet(
        "frontback",
        "multiple",
        [
            AreaSelection("front", [1, 2, 3, 4, 5, 6]),
            AreaSelection("back", [1, 2]),
        ],
        multiplier=2,
        additional=True,
    )
    assert result.valid is True
    assert result.combinations == 6
    assert result.base_amount == 24
    assert result.additional_amount == 12
    assert result.total_amount == 36


def test_banker_rules() -> None:
    """胆拖：红胆 2 个 + 拖 6 个 + 蓝 1 个 = C(6,4)=15 注。"""
    result = validate_bet(
        "redblue",
        "banker",
        [
            AreaSelection("red", [3, 4, 5, 6, 7, 8], [1, 2]),
            AreaSelection("blue", [8]),
        ],
    )
    assert result.valid is True
    assert result.combinations == 15


def test_invalid_banker() -> None:
    """胆码与拖码重复应被拦截。"""
    result = validate_bet(
        "redblue",
        "banker",
        [
            AreaSelection("red", [1, 3, 4, 5, 6, 7], [1, 2]),
            AreaSelection("blue", [8]),
        ],
    )
    assert result.valid is False
    assert any("重复" in str(error["message"]) for error in result.errors)


def test_amount_limit() -> None:
    """超过单票金额上限应被拦截。"""
    result = validate_bet(
        "redblue",
        "multiple",
        [
            AreaSelection("red", list(range(1, 20))),
            AreaSelection("blue", [8]),
        ],
    )
    assert result.valid is False
    assert any("上限" in str(error["message"]) for error in result.errors)


def test_single_mode_rejects_banker() -> None:
    """单式模式不允许胆码。"""
    result = validate_bet(
        "redblue",
        "single",
        [
            AreaSelection("red", [1, 2, 3, 4, 5], [1]),
            AreaSelection("blue", [8]),
        ],
    )
    assert result.valid is False
