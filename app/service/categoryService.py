from sqlalchemy.orm import Session

from app.repository.categoryrepository import CategoryRepository

from app.schema.categorySchemas import CategorySchema, CategoryCreateSchema, CategoryUpdateSchema
from exceptions.exceptions import CategoryNotFoundException


class CategoryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.category_repository = CategoryRepository(db)

    def list_categories(self) -> list[CategorySchema]:
        categories = self.category_repository.get_all()
        return [CategorySchema.model_validate(category) for category in categories]

    def create_category(self, category_create: CategoryCreateSchema) -> CategorySchema:
        new_category = self.category_repository.create(name=category_create.name)
        self.db.commit()
        return CategorySchema.model_validate(new_category)

    def update_category(self, category_id: str, category: CategoryUpdateSchema) -> CategorySchema:
        try:
            category_for_update = self.category_repository.get_by_id(category_id=category_id)
        except Exception:
            raise CategoryNotFoundException(f"Категория с ID {category_id} не найдена")
        if category.name is not None:
            category_for_update.name = category.name

        self.db.commit()
        return CategorySchema.model_validate(category_for_update)

    def delete_category(self, category_id: str ) -> None:
        try:
            category_for_delete = self.category_repository.get_by_id(category_id=category_id)
        except Exception:
            raise CategoryNotFoundException(f"Категория с ID {category_id} не найдена")
        self.category_repository.delete(category_for_delete)
        self.db.commit()
