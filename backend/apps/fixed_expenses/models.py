from django.conf import settings
from django.db import models

from core.models import BaseModel


class FixedExpense(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fixed_expenses"
    )
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, blank=True
    )
    name = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_day = models.PositiveSmallIntegerField(help_text="Dia do mês (1-31)")
    is_paid_this_month = models.BooleanField(default=False)
    last_paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "fixed_expenses"
        ordering = ["due_day", "name"]

    def __str__(self):
        return f"{self.name} - R${self.amount} (dia {self.due_day})"
