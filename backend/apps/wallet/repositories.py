from core.repositories import BaseRepository

from .models import Salary, Wallet


class WalletRepository(BaseRepository):
    model = Wallet

    def get_primary(self, user):
        return self.model.objects.filter(user=user).first()


class SalaryRepository(BaseRepository):
    model = Salary

    def get_current(self, user):
        return self.model.objects.filter(user=user).first()
