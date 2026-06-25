from django.conf import settings
from django.db import models

from core.models import BaseModel


class Goal(BaseModel):
    class StatusChoices(models.TextChoices):
        IN_PROGRESS = "in_progress", "Em progresso"
        COMPLETED = "completed", "Concluída"
        CANCELLED = "cancelled", "Cancelada"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goals"
    )
    couple_group = models.ForeignKey(
        "couples.CoupleGroup", on_delete=models.SET_NULL, null=True, blank=True, related_name="goals"
    )
    name = models.CharField(max_length=150)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.IN_PROGRESS)

    class Meta:
        db_table = "goals"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def progress_percent(self):
        if self.target_amount == 0:
            return 0
        return round((self.current_amount / self.target_amount) * 100, 2)
