"""注册限流回归：单来源与全局额度不可通过切换来源绕过。"""

import pytest
from fastapi import HTTPException

from app.common.rate_limit import RequestLimiter


def test_source_and_global_limits() -> None:
    """单来源超过额度返回 429，切换来源后仍受全局额度限制。"""
    limiter = RequestLimiter(per_source=1, total=2)
    limiter.check("source-a")
    with pytest.raises(HTTPException) as failure:
        limiter.check("source-a")
    assert failure.value.status_code == 429
    limiter.check("source-b")
    with pytest.raises(HTTPException):
        limiter.check("source-c")
    assert len(limiter.events) == 2


def test_expired_window_recovers(monkeypatch: pytest.MonkeyPatch) -> None:
    """时间窗口过期后请求可继续，旧事件被移除而非无限积累。"""
    monkeypatch.setattr("app.common.rate_limit.time.monotonic", lambda: 10)
    limiter = RequestLimiter(per_source=1, total=1)
    limiter.check("source-a")
    monkeypatch.setattr("app.common.rate_limit.time.monotonic", lambda: 71)
    limiter.check("source-a")
    assert len(limiter.events) == 1
