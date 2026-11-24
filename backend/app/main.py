"""服务入口：FastAPI 应用、生命周期、中间件与路由装配。"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.ai.views import router as ai_router
from app.auth.views import router as auth_router
from app.backtest.views import router as backtest_router
from app.common.exceptions import ApiError
from app.common.response import error_response
from app.config.config import settings
from app.dependencies import init_database
from app.draws.views import router as draws_router
from app.games.views import router as games_router
from app.meta_views import router as meta_router
from app.recommend.views import router as recommend_router
from app.stats.views import router as stats_router
from app.utils.logger import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """启动与关闭钩子。

    Args:
        app: FastAPI 应用。

    Yields:
        None。
    """
    setup_logging(settings.log_level)
    database = init_database()
    if database.count_users() == 0:
        database.create_user(
            settings.admin_username,
            settings.admin_password,
            role="admin",
        )
        logger.warning("已创建初始管理员账号（请尽快修改默认密码）")
    logger.info(
        "服务启动完成：db_type={} draws(redblue)={} draws(frontback)={}",
        settings.db_type,
        database.count_draws("redblue"),
        database.count_draws("frontback"),
    )
    yield
    database.close()


app = FastAPI(
    title="Lucky Picks API",
    version="2.0.0",
    description="开奖数据、统计、全玩法校验、推荐与回测接口（需登录）",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):  # type: ignore[no-untyped-def]
    """为每个请求生成标识并写入响应头。

    Args:
        request: 请求对象。
        call_next: 下一个中间件/路由处理函数。

    Returns:
        响应对象。
    """
    import uuid

    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.exception_handler(ApiError)
async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    """业务异常 → 统一响应。

    Args:
        request: 请求对象。
        exc: 业务异常。

    Returns:
        JSON 响应。
    """
    logger.warning("业务错误：code={} message={}", exc.code.value, exc.message)
    return JSONResponse(
        status_code=exc.status,
        content={
            "code": exc.code.value,
            "message": exc.message,
            "data": exc.data or {},
            "requestId": getattr(request.state, "request_id", "-"),
        },
    )


@app.exception_handler(HTTPException)
async def handle_http_error(request: Request, exc: HTTPException) -> JSONResponse:
    """HTTP 异常 → 统一响应。

    Args:
        request: 请求对象。
        exc: HTTP 异常。

    Returns:
        JSON 响应。
    """
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            40100 if exc.status_code == 401 else 40000,
            str(exc.detail),
            request,
        ),
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """请求参数错误 → 统一响应。

    Args:
        request: 请求对象。
        exc: 参数校验异常。

    Returns:
        JSON 响应。
    """
    return JSONResponse(
        status_code=422,
        # 校验详情只保留字段位置和原因，避免回显密码及不可 JSON 序列化的异常上下文。
        content=error_response(42200, "请求参数不合法", request, {"errors": [
            {key: item[key] for key in ("loc", "msg", "type") if key in item}
            for item in exc.errors()
        ]}),
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """兜底异常处理器：记录完整堆栈。

    Args:
        request: 请求对象。
        exc: 异常对象。

    Returns:
        JSON 响应。
    """
    logger.exception("未预期错误：request_id={}", getattr(request.state, "request_id", "-"))
    return JSONResponse(
        status_code=500,
        content=error_response(50000, "服务内部错误", request),
    )


@app.get("/health", tags=["meta"], summary="健康检查")
def health() -> dict:
    """健康检查。

    Returns:
        健康状态。
    """
    database = init_database()
    return {
        "status": "ok"
        if database.count_draws("redblue") or database.count_draws("frontback")
        else "degraded",
        "version": "2.0.0",
        "database": {
            "type": settings.db_type,
            "name": settings.db_name if settings.db_type == "mariadb" else settings.db_path,
            "version": database.db_version(),
            "draws": database.count_draws("redblue") + database.count_draws("frontback"),
        },
        "dataUpdatedAt": database.latest_draw("redblue").fetched_at
        if database.latest_draw("redblue")
        else None,
    }


app.include_router(auth_router)
app.include_router(games_router)
app.include_router(ai_router)
app.include_router(draws_router)
app.include_router(stats_router)
app.include_router(recommend_router)
app.include_router(backtest_router)
app.include_router(meta_router)
