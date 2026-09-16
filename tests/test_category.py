from unittest.mock import Mock

import pytest

from app.dataBase.models import Category
from app.schema.categorySchemas import (
    CategoryCreateSchema,
    CategorySchema,
    CategoryUpdateSchema,
)
from app.service.categoryService import CategoryNotFoundException, CategoryService


def test_list_category_return_pd_models(
    category_service: CategoryService,
    repository_category_mock: Mock,
) -> None:
    repository_category_mock.get_all.return_value = [
        Category(id="category-1", name="Домашние дела"),
        Category(id="category-2", name="Учеба"),
    ]

    result = category_service.list_categories()

    assert result == [
        CategorySchema(id="category-1", name="Домашние дела"),
        CategorySchema(id="category-2", name="Учеба"),
    ]


def test_create_category_commits_created_category(
    category_service: CategoryService,
    db_mock: Mock,
    repository_category_mock: Mock,
) -> None:
    created_category = Category(id="category-1", name="Домашние дела")
    repository_category_mock.create.return_value = created_category

    result = category_service.create_category(
        CategoryCreateSchema(name="Домашние дела")
    )

    repository_category_mock.create.assert_called_once_with(name="Домашние дела")

    db_mock.commit.assert_called_once_with()

    assert result.model_dump() == {"id": "category-1", "name": "Домашние дела"}


def test_update_category_raises_when_category_not_found(
    category_service: CategoryService,
    db_mock: Mock,
    repository_category_mock: Mock,
) -> None:
    repository_category_mock.get_by_id.return_value = None

    with pytest.raises(CategoryNotFoundException):
        category_service.update_category(
            "missing-category", CategoryUpdateSchema(name="Ууупс")
        )

    db_mock.commit.assert_not_called()
