from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dataBase.models import Task


class TaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all(self) -> list[Task]:
        return self.db.scalars(select(Task)).all()

    def get_by_id(self, task_id: str) -> Task | None:
        return self.db.get(Task, task_id)

    def create(self, title: str) -> Task:
        new_task = Task(title=title, completed=False)
        self.db.add(new_task)
        return new_task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
