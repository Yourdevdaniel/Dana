from django.conf import settings
from django.db import models

from core.models import BaseModel


class Notification(BaseModel):
    class TypeChoices(models.TextChoices):
        INFO = "info", "Informação"
        SUCCESS = "success", "Sucesso"
        WARNING = "warning", "Aviso"
        ERROR = "error", "Erro"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    type = models.CharField(max_length=10, choices=TypeChoices.choices, default=TypeChoices.INFO)
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.name} - {self.title}"
