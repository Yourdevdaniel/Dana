from rest_framework import serializers

from .models import Investment


class InvestmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investment
        fields = [
            "id",
            "name",
            "asset_type",
            "institution",
            "invested_amount",
            "current_amount",
            "monthly_contribution",
            "purchase_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InvestmentCreateSerializer(serializers.ModelSerializer):
    current_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False
    )

    class Meta:
        model = Investment
        fields = [
            "name",
            "asset_type",
            "institution",
            "invested_amount",
            "current_amount",
            "monthly_contribution",
            "purchase_date",
        ]

    def validate_invested_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Valor investido deve ser maior que zero.")
        return value

    def validate_current_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Valor atual não pode ser negativo.")
        return value

    def validate_monthly_contribution(self, value):
        if value < 0:
            raise serializers.ValidationError("Aporte mensal não pode ser negativo.")
        return value

    def validate(self, attrs):
        if "current_amount" not in attrs or attrs.get("current_amount") is None:
            attrs["current_amount"] = attrs.get("invested_amount", 0)
        return attrs


class InvestmentUpdateSerializer(serializers.ModelSerializer):
    """invested_amount é bloqueado após criação — editar valor requer evento de resgate/aporte."""

    class Meta:
        model = Investment
        fields = [
            "name",
            "asset_type",
            "institution",
            "current_amount",
            "monthly_contribution",
            "purchase_date",
        ]

    def validate_current_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Valor atual não pode ser negativo.")
        return value

    def validate_monthly_contribution(self, value):
        if value < 0:
            raise serializers.ValidationError("Aporte mensal não pode ser negativo.")
        return value
