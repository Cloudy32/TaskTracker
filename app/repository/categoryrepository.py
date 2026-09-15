from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dataBase.models import Category


class CategoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all(self) -> list[Category]:
        return list(self.db.scalars(select(Category)).all())

    def get_by_id(self, category_id: str) -> Category | None:
        return self.db.get(Category, category_id)

    def create(self, name: str) -> Category:
        category = Category(name=name)
        self.db.add(category)

        return category

    def delete(self, category: Category) -> None:
        return self.db.delete(category)
