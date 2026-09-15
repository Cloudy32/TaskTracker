from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_task_service
from app.schema.taskSchemas import TaskCreateSchema, TaskSchema, TaskUpdateSchema
from app.service.taskService import TaskService
from exceptions.exceptions import TaskNotFoundException

task_router = APIRouter(prefix="/tasks")


@task_router.get("", response_model=list[TaskSchema])
def get_tasks(
    task_service: TaskService = Depends(get_task_service),
) -> list[TaskSchema]:
    return task_service.list_tasks()


@task_router.post("", response_model=TaskSchema, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreateSchema, task_service: TaskService = Depends(get_task_service)
) -> TaskSchema:
    return task_service.create_task(payload)


@task_router.patch("/{task_id}", response_model=TaskSchema)
def update_task(
    task_id: str,
    payload: TaskUpdateSchema,
    task_service: TaskService = Depends(get_task_service),
) -> TaskSchema:
    try:
        return task_service.update_task(task_id=task_id, task=payload)
    except TaskNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@task_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str, task_service: TaskService = Depends(get_task_service)
) -> None:
    try:
        return task_service.delete_task(task_id=task_id)
    except TaskNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
