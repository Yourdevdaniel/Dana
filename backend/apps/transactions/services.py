from core.services import BaseService

from .repositories import TransactionRepository

XP_PER_TRANSACTION = 10


class TransactionService(BaseService):
    repository_class = TransactionRepository

    def create_transaction(self, user, data: dict):
        transaction = self.repository.create(user=user, **data)
        user.add_xp(XP_PER_TRANSACTION, reason="transaction", reference_id=str(transaction.id))
        return transaction

    def delete_transaction(self, instance):
        self.repository.delete(instance)
