from django.conf import settings
from django.db import models

from core.models import BaseModel


class Wallet(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallets"
    )
    name = models.CharField(max_length=100, default="Carteira Principal")
    currency = models.CharField(max_length=3, default="BRL")

    class Meta:
        db_table = "wallets"

    def __str__(self):
        return f"{self.user.name} - {self.name}"

    @property
    def balance(self):
        from django.db.models import Sum
        from apps.transactions.models import Transaction

        income = (
            Transaction.objects.filter(wallet=self, type="income")
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )
        expense = (
            Transaction.objects.filter(wallet=self, type="expense")
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )
        return income - expense


class Salary(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="salaries"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    effective_date = models.DateField()
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "salaries"
        ordering = ["-effective_date"]

    def __str__(self):
        return f"{self.user.name} - R${self.amount} ({self.effective_date})"
