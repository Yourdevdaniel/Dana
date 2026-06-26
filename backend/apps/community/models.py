from django.conf import settings
from django.db import models

from core.models import BaseModel


class Friendship(BaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pendente"
        ACCEPTED = "accepted", "Aceita"
        REJECTED = "rejected", "Rejeitada"
        BLOCKED = "blocked", "Bloqueada"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_friend_requests",
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_friend_requests",
    )
    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
    )

    class Meta:
        db_table = "friendships"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["requester", "receiver"],
                name="unique_friendship_pair",
            )
        ]

    def __str__(self):
        return f"{self.requester} -> {self.receiver} ({self.status})"


class CommunityNudge(BaseModel):
    class StatusChoices(models.TextChoices):
        SCHEDULED = "scheduled", "Agendado"
        DELIVERED = "delivered", "Entregue"
        CANCELLED = "cancelled", "Cancelado"

    ALLOWED_MESSAGES = [
        "Continue, você está indo muito bem!",
        "Mande ver, falta pouco!",
        "Parabéns pelo progresso!",
    ]

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_nudges",
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_nudges",
    )
    message = models.CharField(max_length=200)
    deliver_at = models.DateTimeField()
    delivered_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
        default=StatusChoices.SCHEDULED,
    )

    class Meta:
        db_table = "community_nudges"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender} -> {self.receiver}: {self.message[:30]}"
