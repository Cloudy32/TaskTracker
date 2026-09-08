from fastapi import APIRouter, status, Depends, HTTPException

from app.schema.categorySchemas import CategorySchema, CategoryCreateSchema, CategoryUpdateSchema
from app.service.categoryService import CategoryService
from app.api.dependencies import get_categories_service
from exceptions.exceptions import CategoryNotFoundException

category_router = APIRouter(prefix="/categories")


@category_router.get("", response_model=list[CategorySchema], status_code=status.HTTP_200_OK)
def get_categories(category_service: CategoryService = Depends(get_categories_service)) -> list[CategorySchema]:
    return category_service.list_categories()

@category_router.post("", response_model=CategorySchema, status_code=status.HTTP_201_CREATED)
def create_new_category(
        payload: CategoryCreateSchema,
        category_service: CategoryService = Depends(get_categories_service)
) -> CategorySchema:
    return category_service.create_category(payload)

@category_router.patch("/{category_id}", response_model=CategorySchema, status_code=status.HTTP_200_OK)
def update_category(
        category_id: str,
        payload:CategoryUpdateSchema,
        category_service: CategoryService = Depends(get_categories_service)
) -> CategorySchema:
    try:
        return category_service.update_category(category_id=category_id, category=payload)
    except CategoryNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

@category_router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: str, category_service: CategoryService = Depends(get_categories_service)):
    try:
        return category_service.delete_category(category_id=category_id)
    except CategoryNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)