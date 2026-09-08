from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.dataBase.base import Base
from app.dataBase.session import engine

from app.core.config import get_settings

from app.api.routers.task import task_router
from app.api.routers.category import category_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

settings = get_settings()

app = FastAPI(lifespan=lifespan)
app.include_router(task_router)
app.include_router(category_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["*"],
)


