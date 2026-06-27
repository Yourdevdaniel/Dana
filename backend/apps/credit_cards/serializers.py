from rest_framework import serializers

from .models import CreditCard


class CreditCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditCard
        fields = [
            "id", "nickname", "credit_limit", "current_debt",
            "monthly_interest", "closing_day", "due_day",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_closing_day(self, value):
        if not 1 <= value <= 31:
            raise serializers.ValidationError("Dia de fechamento deve ser entre 1 e 31.")
        return value

    def validate_due_day(self, value):
        if not 1 <= value <= 31:
            raise serializers.ValidationError("Dia de vencimento deve ser entre 1 e 31.")
        return value

    def validate_credit_limit(self, value):
        if value <= 0:
            raise serializers.ValidationError("Limite deve ser maior que zero.")
        return value

    def validate_current_debt(self, value):
        if value < 0:
            raise serializers.ValidationError("Dívida atual não pode ser negativa.")
        return value
