from core.repositories import BaseRepository

from .models import Goal


class GoalRepository(BaseRepository):
    model = Goal
