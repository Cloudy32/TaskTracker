from unittest.mock import Mock

import pytest
from sqlalchemy.orm import Session

from app.repository.categoryrepository import CategoryRepository
from app.repository.taskrepository import TaskRepository
from app.service.categoryService import CategoryService
from app.service.taskService import TaskService


@pytest.fixture
def db_mock() -> Mock:
    return Mock(spec=Session)


@pytest.fixture
def repository_task_mock() -> Mock:
    return Mock(spec=TaskRepository)


@pytest.fixture
def repository_category_mock() -> Mock:
    return Mock(spec=CategoryRepository)


@pytest.fixture
def service(db_mock: Mock, repository_task_mock: Mock) -> TaskService:
    task_service = TaskService(db=db_mock)
    task_service.task_repository = repository_task_mock
    return task_service


@pytest.fixture
def category_service(db_mock: Mock, repository_category_mock: Mock) -> CategoryService:
    category_service = CategoryService(db=db_mock)
    category_service.category_repository = repository_category_mock
    return category_service
