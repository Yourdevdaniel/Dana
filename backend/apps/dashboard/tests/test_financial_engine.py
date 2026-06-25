import pytest
from decimal import Decimal

from apps.dashboard.services import FinancialEngine
from apps.wallet.models import Wallet
from apps.transactions.models import Transaction


@pytest.mark.django_db
class TestFinancialEngine:
    def _engine(self, user):
        return FinancialEngine(user)

    def test_balance_empty(self, user):
        engine = self._engine(user)
        assert engine.balance() == Decimal("0")

    def test_balance_income_minus_expense(self, user):
        wallet = Wallet.objects.create(user=user)
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("1000"), type="income", date="2026-01-01")
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("300"), type="expense", date="2026-01-15")
        engine = self._engine(user)
        assert engine.balance() == Decimal("700")

    def test_financial_risk_no_transactions(self, user):
        engine = self._engine(user)
        assert engine.financial_risk_score() == "critical"

    def test_recommended_reserve_is_6x_average(self, user):
        wallet = Wallet.objects.create(user=user)
        for i in range(3):
            Transaction.objects.create(
                user=user, wallet=wallet, amount=Decimal("500"),
                type="expense", date=f"2026-0{i+1}-01"
            )
        engine = self._engine(user)
        assert engine.recommended_reserve() == engine.monthly_average_expense() * 6
