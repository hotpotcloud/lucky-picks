"""公共枚举：玩法、模式、策略与错误码。

命名遵循项目术语规范：只用中性术语（红蓝玩法 / 前后玩法 / 选号），
不使用真实游戏名称及其等价写法。
"""

from enum import Enum


class GameId(str, Enum):
    """支持的玩法标识。"""

    RED_BLUE = "redblue"
    FRONT_BACK = "frontback"


class Mode(str, Enum):
    """投注模式。"""

    SINGLE = "single"
    MULTIPLE = "multiple"
    BANKER = "banker"


class Strategy(str, Enum):
    """推荐策略。"""

    BALANCED = "balanced"
    HOT = "hot"
    COLD = "cold"
    OMISSION = "omission"
    BAYESIAN = "bayesian"
    COVERAGE = "coverage"


class ErrorCode(str, Enum):
    """业务错误码。"""

    GAME_NOT_FOUND = "GAME_NOT_FOUND"
    INVALID_SELECTION = "INVALID_SELECTION"
    INVALID_MODE = "INVALID_MODE"
    AMOUNT_LIMIT = "AMOUNT_LIMIT"
    COMBINATION_TOO_LARGE = "COMBINATION_TOO_LARGE"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
