"""业务异常与统一错误响应。

所有业务异常都携带错误码与可读的中文原因，便于前端就地展示。
"""

from typing import Any, Optional

from app.common.enums import ErrorCode


class ApiError(Exception):
    """业务异常基类。

    Attributes:
        code: 业务错误码。
        message: 可直接展示给用户的中文原因。
        status: HTTP 状态码。
        data: 附加信息，例如具体超限金额。
    """

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status: int = 400,
        data: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.data = data


class GameNotFound(ApiError):
    """玩法不存在。"""

    def __init__(self, game: str) -> None:
        super().__init__(ErrorCode.GAME_NOT_FOUND, f"未知玩法：{game}", status=404)


class InvalidSelection(ApiError):
    """选号不合法。"""

    def __init__(self, message: str, data: Optional[Any] = None) -> None:
        super().__init__(ErrorCode.INVALID_SELECTION, message, status=200, data=data)


class InvalidMode(ApiError):
    """模式与选号不匹配。"""

    def __init__(self, message: str) -> None:
        super().__init__(ErrorCode.INVALID_MODE, message, status=200)


class AmountLimit(ApiError):
    """超过官方单票金额上限。"""

    def __init__(self, message: str, data: Optional[Any] = None) -> None:
        super().__init__(ErrorCode.AMOUNT_LIMIT, message, status=200, data=data)


class DataUnavailable(ApiError):
    """数据不可用。"""

    def __init__(self, message: str = "数据暂不可用") -> None:
        super().__init__(ErrorCode.DATA_UNAVAILABLE, message, status=503)
