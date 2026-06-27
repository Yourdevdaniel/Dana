from django.conf import settings
from django.db import models

from core.models import BaseModel


class CreditCard(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_cards",
    )
    nickname = models.CharField(max_length=100)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2)
    current_debt = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monthly_interest = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    closing_day = models.PositiveSmallIntegerField()
    due_day = models.PositiveSmallIntegerField()

    class Meta:
        db_table = "credit_cards"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.name} - {self.nickname}"
