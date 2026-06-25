from core.services import BaseService

from .repositories import SalaryRepository, WalletRepository


class WalletService(BaseService):
    repository_class = WalletRepository

    def get_or_create_wallet(self, user):
        wallet = self.repository.get_primary(user)
        if not wallet:
            wallet = self.repository.create(user=user)
        return wallet


class SalaryService(BaseService):
    repository_class = SalaryRepository

    def register(self, user, data: dict):
        return self.repository.create(user=user, **data)
