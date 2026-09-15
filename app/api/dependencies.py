from fastapi import Depends
from sqlalchemy.orm import Session

from app.dataBase.session import get_db
from app.service.categoryService import CategoryService
from app.service.taskService import TaskService


def get_task_service(db: Session = Depends(get_db)):
    return TaskService(db=db)


def get_categories_service(db: Session = Depends(get_db)):
    return CategoryService(db=db)
