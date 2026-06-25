import secrets
import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra):
        if not email:
            raise ValueError("E-mail é obrigatório.")
        user = self.model(email=self.normalize_email(email), name=name, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_email_verified", True)
        return self.create_user(email, name, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    avatar = models.TextField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    couple_group = models.ForeignKey(
        "couples.CoupleGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )
    total_xp = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=64, null=True, blank=True)
    email_verification_expires = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    def generate_verification_token(self):
        self.email_verification_token = secrets.token_urlsafe(48)
        self.email_verification_expires = timezone.now() + timedelta(hours=24)
        self.save(update_fields=["email_verification_token", "email_verification_expires"])
        return self.email_verification_token

    def add_xp(self, amount: int, reason: str, reference_id: str = ""):
        from apps.gamification.services import XPService

        XPService().award(user=self, amount=amount, reason=reason, reference_id=reference_id)
