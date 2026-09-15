from sqlalchemy.orm import Session

from app.repository.taskrepository import TaskRepository
from app.schema.taskSchemas import TaskCreateSchema, TaskSchema, TaskUpdateSchema
from exceptions.exceptions import TaskNotFoundException


class TaskService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.task_repository = TaskRepository(db)

    def list_tasks(self) -> list[TaskSchema]:
        tasks = self.task_repository.get_all()
        return [TaskSchema.model_validate(task) for task in tasks]

    def create_task(self, task_create: TaskCreateSchema) -> TaskSchema:
        new_task = self.task_repository.create(title=task_create.title)
        self.db.commit()
        return TaskSchema.model_validate(new_task)

    def update_task(self, task_id: str, task: TaskUpdateSchema) -> TaskSchema:
        task_for_update = self.task_repository.get_by_id(task_id=task_id)

        if not task_for_update:
            raise TaskNotFoundException(f"Задача с ID {task_id} не найдена")

        if task.title is not None:
            task_for_update.title = task.title
        if task.completed is not None:
            task_for_update.completed = task.completed

        self.db.commit()
        return TaskSchema.model_validate(task_for_update)

    def delete_task(self, task_id: str) -> None:
        task_for_delete = self.task_repository.get_by_id(task_id=task_id)

        if not task_for_delete:
            raise TaskNotFoundException(f"Задача с ID {task_id} не найдена")
        self.task_repository.delete(task_for_delete)
        self.db.commit()
