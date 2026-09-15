from sqlalchemy.orm import Mapped, mapped_column

from app.dataBase.base import Base


class Task(Base):
    __tablename__ = "tasks"

    title: Mapped[str]
    completed: Mapped[bool] = mapped_column(default=False)


class Category(Base):
    __tablename__ = "categories"

    name: Mapped[str]
