from django.conf import settings
from django.db import models

from core.models import ActiveManager, SoftDeleteModel


class Transaction(SoftDeleteModel):
    class TypeChoices(models.TextChoices):
        INCOME = "income", "Receita"
        EXPENSE = "expense", "Despesa"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions"
    )
    wallet = models.ForeignKey(
        "wallet.Wallet", on_delete=models.CASCADE, related_name="transactions"
    )
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, related_name="transactions"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, choices=TypeChoices.choices)
    description = models.CharField(max_length=255, blank=True)
    date = models.DateField()
    is_recurring = models.BooleanField(default=False)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        db_table = "transactions"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.type} R${self.amount} - {self.date}"
