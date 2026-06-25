from rest_framework import serializers

from .models import Debt


class DebtSerializer(serializers.ModelSerializer):
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Debt
        fields = [
            "id", "creditor", "amount", "paid_amount", "remaining",
            "due_date", "status", "description", "created_at",
        ]
        read_only_fields = ["id", "remaining", "created_at"]


class DebtCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debt
        fields = ["creditor", "amount", "paid_amount", "due_date", "description"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Valor deve ser positivo.")
        return value
