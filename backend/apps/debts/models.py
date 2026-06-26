from django.conf import settings
from django.db import models

from core.models import BaseModel


class Debt(BaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pendente"
        PAID = "paid", "Pago"
        OVERDUE = "overdue", "Atrasado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="debts"
    )
    creditor = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "debts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.creditor} - R${self.amount}"

    @property
    def remaining(self):
        return max(self.amount - self.paid_amount, 0)
