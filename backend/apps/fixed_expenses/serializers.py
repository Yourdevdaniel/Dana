from rest_framework import serializers

from .models import FixedExpense


class FixedExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixedExpense
        fields = [
            "id", "name", "amount", "due_day", "category",
            "is_paid_this_month", "last_paid_at", "created_at",
        ]
        read_only_fields = ["id", "is_paid_this_month", "last_paid_at", "created_at"]


class FixedExpenseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixedExpense
        fields = ["name", "amount", "due_day", "category"]

    def validate_due_day(self, value):
        if not 1 <= value <= 31:
            raise serializers.ValidationError("Dia deve estar entre 1 e 31.")
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Valor deve ser positivo.")
        return value
