import secrets
import uuid

from django.db import models


class CoupleGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    invite_code = models.CharField(max_length=12, unique=True, editable=False)
    avatar = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "couple_groups"

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(8)[:12].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
