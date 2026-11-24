"""投注规则引擎：合法性校验、组合数与金额计算。

规则要点（官方公开规则，核对日期 2026-11-23）：
- 单式：每个区域号码数恰好等于基础个数，不允许胆码。
- 复式：每个区域号码数不小于基础个数，且至少一个区域大于基础个数；不允许胆码。
- 胆拖：至少一个区域设置胆码；该区域胆码数在 [banker_min, banker_max] 内，
  且胆码 + 拖码数量必须大于基础个数；其余区域按普通选号处理。
- 金额：注数 × 单价 × 倍数；追加玩法再叠加 注数 × 追加单价 × 倍数。
- 上限：基本金额不超过 base_amount_limit；总金额不超过 total_amount_limit。
"""

from dataclasses import dataclass, field
from typing import Dict, List, Sequence

from app.common.enums import ErrorCode, GameId, Mode
from app.common.exceptions import InvalidMode, InvalidSelection
from app.games.config import AreaRule, GameRule, get_game
from app.utils.combinatorics import combination_count

# 组合数安全上限，避免异常输入导致超大整数运算。
MAX_COMBINATIONS = 10_000_000


@dataclass
class AreaSelection:
    """单个区域的选号。

    Attributes:
        key: 区域标识。
        numbers: 普通选号（复式/单式）或拖码（胆拖模式）。
        banker: 胆码。
    """

    key: str
    numbers: List[int] = field(default_factory=list)
    banker: List[int] = field(default_factory=list)


@dataclass
class ValidationResult:
    """校验结果。

    Attributes:
        valid: 是否通过校验。
        mode: 模式。
        combinations: 组合注数。
        base_amount: 基本金额（元）。
        additional_amount: 追加金额（元）。
        total_amount: 总金额（元）。
        normalized_areas: 归一化后的选号。
        errors: 错误列表。
    """

    valid: bool
    mode: Mode
    combinations: int
    base_amount: int
    additional_amount: int
    total_amount: int
    normalized_areas: List[AreaSelection] = field(default_factory=list)
    errors: List[Dict[str, object]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        """转换为接口返回结构。

        Returns:
            可 JSON 序列化的字典。
        """
        return {
            "valid": self.valid,
            "mode": self.mode.value,
            "combinations": self.combinations,
            "baseAmount": self.base_amount,
            "additionalAmount": self.additional_amount,
            "totalAmount": self.total_amount,
            "normalizedAreas": [
                {"key": area.key, "numbers": area.numbers, "banker": area.banker}
                for area in self.normalized_areas
            ],
            "errors": self.errors,
        }


def _check_range(area: AreaRule, values: Sequence[int]) -> bool:
    """校验号码是否都在区域范围内且互不重复。

    Args:
        area: 区域规则。
        values: 号码列表。

    Returns:
        是否合法。
    """
    if len(set(values)) != len(values):
        return False
    return all(area.min <= value <= area.max for value in values)


def validate_bet(
    game_id: str,
    mode: str,
    areas: Sequence[AreaSelection],
    multiplier: int = 1,
    additional: bool = False,
) -> ValidationResult:
    """校验投注方案并计算注数与金额。

    Args:
        game_id: 玩法标识。
        mode: 模式（single/multiple/banker）。
        areas: 各区域选号。
        multiplier: 倍数。
        additional: 是否追加。

    Returns:
        校验结果。

    Raises:
        InvalidMode: 模式非法。
        InvalidSelection: 选号不合法（结构性错误）。
    """
    game: GameRule = get_game(game_id)
    try:
        mode_enum = Mode(mode)
    except ValueError as error:
        raise InvalidMode(f"未知模式：{mode}") from error

    errors: List[Dict[str, object]] = []

    if not isinstance(multiplier, int) or not (
        game.multiplier_min <= multiplier <= game.multiplier_max
    ):
        raise InvalidSelection(
            f"倍数必须是 {game.multiplier_min}–{game.multiplier_max} 的整数",
            {"field": "multiplier"},
        )
    if additional and game.additional_price <= 0:
        raise InvalidSelection("该玩法不支持追加投注", {"field": "additional"})

    by_key: Dict[str, AreaSelection] = {area.key: area for area in areas}
    for area_rule in game.areas:
        if area_rule.key not in by_key:
            errors.append(
                {
                    "code": ErrorCode.INVALID_SELECTION.value,
                    "area": area_rule.key,
                    "message": f"{area_rule.label}未选择号码",
                }
            )
    if errors:
        return ValidationResult(
            valid=False,
            mode=mode_enum,
            combinations=0,
            base_amount=0,
            additional_amount=0,
            total_amount=0,
            errors=errors,
        )

    has_banker = any(area.banker for area in areas)
    if mode_enum is Mode.BANKER and not has_banker:
        errors.append(
            {
                "code": ErrorCode.INVALID_MODE.value,
                "area": None,
                "message": "胆拖模式至少需要一个区域设置胆码",
            }
        )
    if mode_enum is not Mode.BANKER and has_banker:
        errors.append(
            {
                "code": ErrorCode.INVALID_MODE.value,
                "area": None,
                "message": "只有胆拖模式可以设置胆码",
            }
        )

    combinations = 1
    extended = False
    normalized: List[AreaSelection] = []

    for area_rule in game.areas:
        selection = by_key[area_rule.key]
        numbers = sorted(set(selection.numbers))
        banker = sorted(set(selection.banker))

        if not _check_range(area_rule, numbers):
            errors.append(
                {
                    "code": ErrorCode.INVALID_SELECTION.value,
                    "area": area_rule.key,
                    "message": f"{area_rule.label}号码超出范围或存在重复",
                }
            )
            continue
        if not _check_range(area_rule, banker):
            errors.append(
                {
                    "code": ErrorCode.INVALID_SELECTION.value,
                    "area": area_rule.key,
                    "message": f"{area_rule.label}胆码超出范围或存在重复",
                }
            )
            continue

        if banker:
            if area_rule.banker_max <= 0:
                errors.append(
                    {
                        "code": ErrorCode.INVALID_MODE.value,
                        "area": area_rule.key,
                        "message": f"{area_rule.label}不支持胆码",
                    }
                )
                continue
            if not (area_rule.banker_min <= len(banker) <= area_rule.banker_max):
                errors.append(
                    {
                        "code": ErrorCode.INVALID_SELECTION.value,
                        "area": area_rule.key,
                        "message": f"{area_rule.label}胆码必须是 {area_rule.banker_min}–{area_rule.banker_max} 个",
                    }
                )
                continue
            overlap = set(banker) & set(numbers)
            if overlap:
                errors.append(
                    {
                        "code": ErrorCode.INVALID_SELECTION.value,
                        "area": area_rule.key,
                        "message": f"{area_rule.label}胆码与拖码不能重复",
                    }
                )
                continue
            total = len(banker) + len(numbers)
            if total <= area_rule.base_count:
                errors.append(
                    {
                        "code": ErrorCode.INVALID_SELECTION.value,
                        "area": area_rule.key,
                        "message": f"{area_rule.label}胆码与拖码之和必须大于 {area_rule.base_count} 个",
                    }
                )
                continue
            need = area_rule.base_count - len(banker)
            area_combinations = combination_count(len(numbers), need)
            normalized.append(AreaSelection(area_rule.key, numbers, banker))
        else:
            if len(numbers) < area_rule.base_count:
                errors.append(
                    {
                        "code": ErrorCode.INVALID_SELECTION.value,
                        "area": area_rule.key,
                        "message": f"{area_rule.label}至少选择 {area_rule.base_count} 个号码",
                    }
                )
                continue
            if len(numbers) > area_rule.base_count:
                extended = True
            area_combinations = combination_count(len(numbers), area_rule.base_count)
            normalized.append(AreaSelection(area_rule.key, numbers, []))

        combinations *= area_combinations

    if not errors and mode_enum is Mode.MULTIPLE and not extended:
        errors.append(
            {
                "code": ErrorCode.INVALID_MODE.value,
                "area": None,
                "message": "复式模式至少有一个区域选择的号码数超过基础个数",
            }
        )

    if not errors and combinations > MAX_COMBINATIONS:
        errors.append(
            {
                "code": ErrorCode.COMBINATION_TOO_LARGE.value,
                "area": None,
                "message": "组合数过大，请减少所选号码",
            }
        )

    if errors:
        return ValidationResult(
            valid=False,
            mode=mode_enum,
            combinations=combinations,
            base_amount=0,
            additional_amount=0,
            total_amount=0,
            errors=errors,
        )

    base_amount = combinations * game.price * multiplier
    additional_amount = combinations * game.additional_price * multiplier if additional else 0
    total_amount = base_amount + additional_amount

    if base_amount > game.base_amount_limit:
        return ValidationResult(
            valid=False,
            mode=mode_enum,
            combinations=combinations,
            base_amount=base_amount,
            additional_amount=additional_amount,
            total_amount=total_amount,
            normalized_areas=normalized,
            errors=[
                {
                    "code": ErrorCode.AMOUNT_LIMIT.value,
                    "area": None,
                    "message": f"基本投注金额超过上限 {game.base_amount_limit} 元",
                }
            ],
        )
    if total_amount > game.total_amount_limit:
        return ValidationResult(
            valid=False,
            mode=mode_enum,
            combinations=combinations,
            base_amount=base_amount,
            additional_amount=additional_amount,
            total_amount=total_amount,
            normalized_areas=normalized,
            errors=[
                {
                    "code": ErrorCode.AMOUNT_LIMIT.value,
                    "area": None,
                    "message": f"总金额超过上限 {game.total_amount_limit} 元",
                }
            ],
        )

    return ValidationResult(
        valid=True,
        mode=mode_enum,
        combinations=combinations,
        base_amount=base_amount,
        additional_amount=additional_amount,
        total_amount=total_amount,
        normalized_areas=normalized,
    )


def game_payload(game: GameRule) -> Dict[str, object]:
    """把玩法规则转换为接口结构。

    Args:
        game: 玩法规则。

    Returns:
        可 JSON 序列化的字典。
    """
    return {
        "id": game.id.value,
        "name": game.name,
        "description": game.description,
        "price": game.price,
        "additionalPrice": game.additional_price,
        "multiplierMin": game.multiplier_min,
        "multiplierMax": game.multiplier_max,
        "baseAmountLimit": game.base_amount_limit,
        "totalAmountLimit": game.total_amount_limit,
        "areas": [
            {
                "key": area.key,
                "label": area.label,
                "min": area.min,
                "max": area.max,
                "baseCount": area.base_count,
                "bankerMin": area.banker_min,
                "bankerMax": area.banker_max,
                "color": area.color,
            }
            for area in game.areas
        ],
    }


def supported_game_ids() -> List[str]:
    """返回全部玩法标识。

    Returns:
        玩法标识列表。
    """
    return [game_id.value for game_id in GameId]
