from core.repositories import BaseRepository

from .models import Transaction


class TransactionRepository(BaseRepository):
    model = Transaction

    def list_by_user(self, user, **filters):
        return self.model.objects.filter(user=user, **filters)

    def monthly_summary(self, user, year: int, month: int):
        from django.db.models import Sum
        qs = self.model.objects.filter(user=user, date__year=year, date__month=month)
        income = qs.filter(type="income").aggregate(total=Sum("amount"))["total"] or 0
        expense = qs.filter(type="expense").aggregate(total=Sum("amount"))["total"] or 0
        return {"income": income, "expense": expense, "balance": income - expense}
