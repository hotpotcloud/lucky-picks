"""公开注册与高成本接口的进程内限流，不记录凭据。"""

import time
from collections import deque
from threading import Lock

from fastapi import HTTPException, Request
from loguru import logger


class RequestLimiter:
    """按来源和全局窗口限制请求，队列受全局额度约束。"""

    def __init__(self, per_source: int, total: int, seconds: int = 60) -> None:
        """设置单来源、全局次数与时间窗口。"""
        self.per_source = per_source
        self.total = total
        self.seconds = seconds
        self.events: deque[tuple[float, str]] = deque()
        self.lock = Lock()

    def check(self, source: str) -> None:
        """检查并记录请求，超额返回可重试的 429。"""
        now = time.monotonic()
        with self.lock:
            while self.events and self.events[0][0] <= now - self.seconds:
                self.events.popleft()
            if len(self.events) >= self.total or sum(item[1] == source for item in self.events) >= self.per_source:
                # 只记录来源及限流结果，不记录请求体、密码或令牌。
                logger.warning("请求限流：source={} window_seconds={}", source, self.seconds)
                raise HTTPException(status_code=429, detail="请求过于频繁，请稍后重试", headers={"Retry-After": str(self.seconds)})
            self.events.append((now, source))


registration_limiter = RequestLimiter(per_source=20, total=100)
analysis_limiter = RequestLimiter(per_source=5, total=20)


def request_source(request: Request) -> str:
    """仅信任本机受控代理覆盖后的来源头，公网直连不可伪造。"""
    host = request.client.host if request.client else "unknown"
    if host in {"127.0.0.1", "::1"}:
        return request.headers.get("x-forwarded-for", host)
    return host


def limit_registration(request: Request) -> None:
    """公开注册执行来源级与全局限流。"""
    registration_limiter.check(request_source(request))


def limit_analysis(request: Request) -> None:
    """高成本分析执行来源级与全局限流。"""
    analysis_limiter.check(request_source(request))
