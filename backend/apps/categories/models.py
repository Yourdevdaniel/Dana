from django.conf import settings
from django.db import models

from core.models import ActiveManager, SoftDeleteModel


class Category(SoftDeleteModel):
    class TypeChoices(models.TextChoices):
        INCOME = "income", "Receita"
        EXPENSE = "expense", "Despesa"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories",
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TypeChoices.choices, default=TypeChoices.EXPENSE)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default="#7C3AED")
    is_system = models.BooleanField(default=False)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        db_table = "categories"
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name
