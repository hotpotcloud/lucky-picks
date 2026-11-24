"""日志配置：结构化输出、异常堆栈、请求上下文。"""

import sys
from typing import Any, Dict

from loguru import logger


def setup_logging(level: str = "INFO") -> None:
    """初始化日志输出。

    Args:
        level: 日志级别。
    """
    logger.remove()
    logger.add(
        sys.stderr,
        level=level,
        backtrace=False,
        diagnose=False,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | "
            "<cyan>{extra[request_id]}</cyan> | {message}"
        ),
    )


def bind_request(request_id: str) -> Any:
    """为日志绑定请求标识。

    Args:
        request_id: 请求唯一标识。

    Returns:
        绑定后的日志上下文。
    """
    return logger.bind(request_id=request_id)


def log_context(request_id: str) -> Dict[str, Any]:
    """构造日志上下文字典。

    Args:
        request_id: 请求唯一标识。

    Returns:
        上下文字典。
    """
    return {"request_id": request_id}
