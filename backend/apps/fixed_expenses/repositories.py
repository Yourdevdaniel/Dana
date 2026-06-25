from core.repositories import BaseRepository

from .models import FixedExpense


class FixedExpenseRepository(BaseRepository):
    model = FixedExpense
