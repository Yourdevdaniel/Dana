from django.utils import timezone

from core.services import BaseService

from .models import FixedExpense
from .repositories import FixedExpenseRepository

XP_FIXED_EXPENSE_PAID = 50


class FixedExpenseService(BaseService):
    repository_class = FixedExpenseRepository

    def mark_paid(self, user, expense: FixedExpense):
        expense.is_paid_this_month = True
        expense.last_paid_at = timezone.now()
        expense.save(update_fields=["is_paid_this_month", "last_paid_at", "updated_at"])
        user.add_xp(XP_FIXED_EXPENSE_PAID, reason="fixed_expense_paid", reference_id=str(expense.id))
        return expense

    def reset_monthly(self):
        FixedExpense.objects.update(is_paid_this_month=False)
