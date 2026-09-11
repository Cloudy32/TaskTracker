from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

from app.api.routers.task import task_router
from app.api.routers.category import category_router


settings = get_settings()

app = FastAPI()
app.include_router(task_router)
app.include_router(category_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["*"],
)


