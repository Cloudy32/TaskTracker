import logging
from time import perf_counter

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers.category import category_router
from app.api.routers.task import task_router
from app.core.config import get_settings
from app.core.logging_config import configure_logging

configure_logging()

settings = get_settings()

counter = 0
app = FastAPI()
app.include_router(task_router)
app.include_router(category_router)

logger = logging.getLogger("app.middleware")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.middleware("http")
async def log_request(request: Request, call_next) -> Response:
    global counter

    counter += 1
    request_number = counter
    started_at = perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - started_at) * 1000
        logger.exception(
            "Request failed: %s %s completed_in=%.2fms",
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = (perf_counter() - started_at) * 1000
    response.headers["X-Request-Number"] = str(request_number)
    logger.info(
        "%s %s -> %s (%.2f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response
