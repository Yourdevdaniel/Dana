import base64
import re

from rest_framework import serializers

from .models import User

_MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB decoded
_ALLOWED_MIME = {"image/jpeg", "image/png"}


def _validate_strong_password(value):
    errors = []
    if len(value) < 8:
        errors.append("ao menos 8 caracteres")
    if not re.search(r"[A-Z]", value):
        errors.append("ao menos uma letra maiúscula")
    if not re.search(r"[a-z]", value):
        errors.append("ao menos uma letra minúscula")
    if not re.search(r"\d", value):
        errors.append("ao menos um número")
    if not re.search(r"[^A-Za-z0-9]", value):
        errors.append("ao menos um caractere especial")
    if errors:
        raise serializers.ValidationError("Senha deve conter: " + ", ".join(errors) + ".")
    return value


def _validate_base64_avatar(value):
    if not value:
        return value
    raw = value
    mime = None
    if value.startswith("data:"):
        try:
            header, raw = value.split(",", 1)
            mime = header.split(";")[0].split(":")[1]
        except (ValueError, IndexError):
            raise serializers.ValidationError("Formato de avatar inválido.")
        if mime not in _ALLOWED_MIME:
            raise serializers.ValidationError("Avatar deve ser JPEG ou PNG.")
    try:
        decoded = base64.b64decode(raw, validate=True)
    except Exception:
        raise serializers.ValidationError("Avatar não é um base64 válido.")
    if len(decoded) > _MAX_AVATAR_BYTES:
        raise serializers.ValidationError("Avatar excede o limite de 2 MB.")
    return value


class PublicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "avatar", "total_xp", "created_at"]
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "avatar", "date_of_birth", "total_xp", "is_email_verified", "created_at"]
        read_only_fields = ["id", "total_xp", "is_email_verified", "created_at"]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name", "avatar", "date_of_birth"]

    def validate_avatar(self, value):
        return _validate_base64_avatar(value)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "name", "password"]

    def validate_password(self, value):
        return _validate_strong_password(value)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
