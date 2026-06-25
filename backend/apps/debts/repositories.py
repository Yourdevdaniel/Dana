from core.repositories import BaseRepository

from .models import Debt


class DebtRepository(BaseRepository):
    model = Debt
