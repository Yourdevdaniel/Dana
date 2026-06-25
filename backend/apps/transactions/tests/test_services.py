import pytest
from decimal import Decimal

from apps.transactions.models import Transaction
from apps.transactions.services import TransactionService
from apps.wallet.models import Wallet


@pytest.mark.django_db
class TestTransactionService:
    def setup_method(self):
        self.svc = TransactionService()

    def test_create_transaction_awards_xp(self, user, mocker):
        wallet = Wallet.objects.create(user=user)
        mock_xp = mocker.patch.object(user, "add_xp")
        data = {
            "wallet": wallet,
            "amount": Decimal("100.00"),
            "type": "expense",
            "date": "2026-06-01",
        }
        tx = self.svc.create_transaction(user, data)
        assert tx.pk is not None
        mock_xp.assert_called_once_with(10, reason="transaction", reference_id=str(tx.id))

    def test_soft_delete_transaction(self, user):
        wallet = Wallet.objects.create(user=user)
        tx = Transaction.objects.create(
            user=user, wallet=wallet, amount=Decimal("50"), type="income", date="2026-06-01"
        )
        self.svc.delete_transaction(tx)
        tx.refresh_from_db()
        assert tx.is_deleted is True
        assert Transaction.objects.filter(pk=tx.pk).count() == 0
