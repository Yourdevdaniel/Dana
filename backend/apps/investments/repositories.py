from core.repositories import BaseRepository

from .models import Investment


class InvestmentRepository(BaseRepository):
    model = Investment

    def list_for_user(self, user):
        return self.model.objects.filter(user=user)
