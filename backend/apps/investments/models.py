from django.conf import settings
from django.db import models

from core.models import BaseModel


class Investment(BaseModel):
    class AssetTypeChoices(models.TextChoices):
        RENDA_FIXA = "renda_fixa", "Renda Fixa"
        ACOES = "acoes", "Ações"
        FUNDOS = "fundos", "Fundos"
        CRIPTO = "cripto", "Cripto"
        EXTERIOR = "exterior", "Exterior"
        OUTROS = "outros", "Outros"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="investments",
    )
    name = models.CharField(max_length=150)
    asset_type = models.CharField(
        max_length=20,
        choices=AssetTypeChoices.choices,
        default=AssetTypeChoices.OUTROS,
    )
    institution = models.CharField(max_length=150, blank=True)
    invested_amount = models.DecimalField(max_digits=14, decimal_places=2)
    current_amount = models.DecimalField(max_digits=14, decimal_places=2)
    monthly_contribution = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    purchase_date = models.DateField()

    class Meta:
        db_table = "investments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.asset_type})"
