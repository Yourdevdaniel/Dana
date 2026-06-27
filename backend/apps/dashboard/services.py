from decimal import Decimal

from django.db.models import Avg, Sum
from django.utils import timezone


class FinancialEngine:
    """Centraliza todos os cálculos financeiros conforme doc 08_FINANCIAL_ENGINE.md."""

    def __init__(self, user):
        self.user = user
        self.today = timezone.now().date()

    def _transactions_qs(self):
        from apps.transactions.models import Transaction
        return Transaction.objects.filter(user=self.user)

    def balance(self) -> Decimal:
        qs = self._transactions_qs()
        income = qs.filter(type="income").aggregate(t=Sum("amount"))["t"] or Decimal("0")
        expense = qs.filter(type="expense").aggregate(t=Sum("amount"))["t"] or Decimal("0")
        return income - expense

    def net_worth(self) -> Decimal:
        from apps.debts.models import Debt
        balance = self.balance()
        total_debts = (
            Debt.objects.filter(user=self.user, status__in=["pending", "overdue"])
            .aggregate(t=Sum("amount"))["t"] or Decimal("0")
        )
        return balance - total_debts

    def monthly_average_expense(self) -> Decimal:
        from apps.transactions.models import Transaction
        result = (
            Transaction.objects.filter(user=self.user, type="expense")
            .values("date__year", "date__month")
            .annotate(total=Sum("amount"))
            .aggregate(avg=Avg("total"))
        )
        return result["avg"] or Decimal("0")

    def recommended_reserve(self) -> Decimal:
        return self.monthly_average_expense() * 6

    def days_to_goal(self, goal) -> int | None:
        if not goal.deadline:
            return None
        remaining = goal.target_amount - goal.current_amount
        if remaining <= 0:
            return 0
        delta = goal.deadline - self.today
        return max(0, delta.days)

    def monthly_trend(self) -> list:
        from apps.transactions.models import Transaction
        results = []
        for month_offset in range(5, -1, -1):
            month = self.today.month - month_offset
            year = self.today.year
            while month <= 0:
                month += 12
                year -= 1
            qs = Transaction.objects.filter(user=self.user, date__year=year, date__month=month)
            income = qs.filter(type="income").aggregate(t=Sum("amount"))["t"] or Decimal("0")
            expense = qs.filter(type="expense").aggregate(t=Sum("amount"))["t"] or Decimal("0")
            results.append({"year": year, "month": month, "income": income, "expense": expense})
        return results

    def financial_risk_score(self) -> str:
        balance = self.balance()
        reserve = self.recommended_reserve()
        if balance <= 0:
            return "critical"
        if balance < reserve * Decimal("0.5"):
            return "high"
        if balance < reserve:
            return "medium"
        return "low"

    def investment_totals(self) -> dict:
        from apps.investments.models import Investment
        from django.db.models import Sum
        qs = Investment.objects.filter(user=self.user)
        invested = qs.aggregate(t=Sum("invested_amount"))["t"] or Decimal("0")
        current = qs.aggregate(t=Sum("current_amount"))["t"] or Decimal("0")
        return {"investment_total": invested, "investment_current_value": current}

    def summary(self) -> dict:
        inv = self.investment_totals()
        return {
            "balance": self.balance(),
            "net_worth": self.net_worth(),
            "monthly_average_expense": self.monthly_average_expense(),
            "recommended_reserve": self.recommended_reserve(),
            "monthly_trend": self.monthly_trend(),
            "financial_risk": self.financial_risk_score(),
            "investment_total": inv["investment_total"],
            "investment_current_value": inv["investment_current_value"],
        }
