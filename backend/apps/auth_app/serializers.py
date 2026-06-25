from django.contrib.auth import authenticate
from django.core.cache import cache
from rest_framework import serializers

_MAX_ATTEMPTS = 5
_LOCK_SECONDS = 900  # 15 min
_ATTEMPT_TTL = 3600  # reset counter after 1 hour


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].lower()
        lock_key = f"auth_lock:{email}"
        fail_key = f"auth_fail:{email}"

        if cache.get(lock_key):
            raise serializers.ValidationError(
                "Conta temporariamente bloqueada. Tente novamente em 15 minutos."
            )

        user = authenticate(email=email, password=attrs["password"])

        if not user or not user.is_active:
            fails = cache.get(fail_key, 0) + 1
            cache.set(fail_key, fails, timeout=_ATTEMPT_TTL)
            if fails >= _MAX_ATTEMPTS:
                cache.set(lock_key, True, timeout=_LOCK_SECONDS)
            raise serializers.ValidationError("Credenciais inválidas.")

        if not user.is_email_verified:
            raise serializers.ValidationError(
                "Verifique seu email antes de fazer login. Acesse sua caixa de entrada."
            )

        cache.delete(fail_key)
        cache.delete(lock_key)
        attrs["user"] = user
        return attrs
