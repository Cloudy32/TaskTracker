from unittest.mock import Mock

import pytest

from app.dataBase.models import Task
from app.schema.taskSchemas import TaskCreateSchema, TaskSchema, TaskUpdateSchema
from app.service.taskService import TaskNotFoundException, TaskService


def test_list_task_return_pd_models(
    service: TaskService,
    repository_task_mock: Mock,
) -> None:
    repository_task_mock.get_all.return_value = [
        Task(id="task-1", title="Изучить pytest", completed=False),
        Task(id="task-2", title="Написать первый тест", completed=True),
    ]

    result = service.list_tasks()

    assert result == [
        TaskSchema(id="task-1", title="Изучить pytest", completed=False),
        TaskSchema(id="task-2", title="Написать первый тест", completed=True),
    ]


def test_create_task_commits_created_task(
    service: TaskService,
    db_mock: Mock,
    repository_task_mock: Mock,
) -> None:
    created_task = Task(id="task-1", title="Новая задача", completed=False)
    repository_task_mock.create.return_value = created_task

    result = service.create_task(TaskCreateSchema(title="Новая задача"))

    repository_task_mock.create.assert_called_once_with(title="Новая задача")

    db_mock.commit.assert_called_once_with()
    assert result.model_dump() == {
        "id": "task-1",
        "title": "Новая задача",
        "completed": False,
    }


@pytest.mark.parametrize(
    ("payload", "expected_title", "expected_completed"),
    [
        pytest.param(
            TaskUpdateSchema(title="Обновить заголовок"), "Обновить заголовок", False
        ),
        pytest.param(TaskUpdateSchema(completed=True), "Старая задача", True),
        pytest.param(TaskUpdateSchema(title="Готово", completed=True), "Готово", True),
    ],
)
def test_update_task_updates_only_passed_fields(
    service: TaskService,
    db_mock: Mock,
    repository_task_mock: Mock,
    payload: TaskUpdateSchema,
    expected_title: str,
    expected_completed: bool,
) -> None:
    task = Task(id="task-1", title="Старая задача", completed=False)

    repository_task_mock.get_by_id.return_value = task

    result = service.update_task("task-1", payload)

    repository_task_mock.get_by_id.assert_called_once_with(task_id="task-1")
    db_mock.commit.assert_called_once_with()
    assert result.model_dump() == {
        "id": "task-1",
        "title": expected_title,
        "completed": expected_completed,
    }


def test_update_task_raises_when_task_not_found(
    service: TaskService,
    db_mock: Mock,
    repository_task_mock: Mock,
) -> None:
    repository_task_mock.get_by_id.return_value = None

    with pytest.raises(TaskNotFoundException):  # Должна произойти указанная ошибка
        service.update_task("missing-task", TaskUpdateSchema(title="Неважно"))

    db_mock.commit.assert_not_called()
