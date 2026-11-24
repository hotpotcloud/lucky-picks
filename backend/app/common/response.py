"""统一响应封装：所有接口返回 `{code, message, data, requestId}`。"""

from typing import Any, Dict, Optional

from fastapi import Request


def request_id_of(request: Request) -> str:
    """取请求标识。

    Args:
        request: 请求对象。

    Returns:
        请求标识。
    """
    return getattr(request.state, "request_id", "-")


def ok_response(data: Any, request: Request) -> Dict[str, Any]:
    """构造成功响应。

    Args:
        data: 业务数据。
        request: 请求对象。

    Returns:
        响应字典。
    """
    return {
        "code": 0,
        "message": "ok",
        "data": data,
        "requestId": request_id_of(request),
    }


def error_response(
    code: int, message: str, request: Request, data: Optional[Any] = None
) -> Dict[str, Any]:
    """构造失败响应。

    Args:
        code: 业务错误码。
        message: 错误说明。
        request: 请求对象。
        data: 附加数据。

    Returns:
        响应字典。
    """
    return {
        "code": code,
        "message": message,
        "data": data if data is not None else {},
        "requestId": request_id_of(request),
    }
