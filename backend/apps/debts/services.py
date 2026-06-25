from django.utils import timezone

from core.services import BaseService

from .models import Debt
from .repositories import DebtRepository


class DebtService(BaseService):
    repository_class = DebtRepository

    def pay(self, debt: Debt, amount):
        debt.paid_amount += amount
        if debt.paid_amount >= debt.amount:
            debt.paid_amount = debt.amount
            debt.status = Debt.StatusChoices.PAID
        debt.save()
        return debt

    def refresh_overdue(self):
        today = timezone.now().date()
        Debt.objects.filter(
            status=Debt.StatusChoices.PENDING,
            due_date__lt=today,
        ).update(status=Debt.StatusChoices.OVERDUE)
