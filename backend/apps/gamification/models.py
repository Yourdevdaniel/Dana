import uuid

from django.conf import settings
from django.db import models

from core.models import BaseModel


class Badge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=50)
    xp_reward = models.PositiveIntegerField(default=0)
    condition_type = models.CharField(max_length=50)
    condition_value = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "badges"

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_badges")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_badges"
        unique_together = [["user", "badge"]]


class XPHistory(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="xp_history"
    )
    amount = models.IntegerField()
    reason = models.CharField(max_length=100)
    reference_id = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "xp_history"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.name} +{self.amount} XP ({self.reason})"


class Ranking(models.TextChoices):
    WEEKLY = "weekly", "Semanal"
    MONTHLY = "monthly", "Mensal"
    GENERAL = "general", "Geral"
