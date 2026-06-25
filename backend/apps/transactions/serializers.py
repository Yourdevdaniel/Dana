from rest_framework import serializers

from apps.categories.serializers import CategorySerializer

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source="category", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "amount", "type", "description", "date",
            "is_recurring", "category", "category_detail",
            "wallet", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class TransactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["amount", "type", "description", "date", "is_recurring", "category", "wallet"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Valor deve ser positivo.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs

        wallet = attrs.get("wallet")
        if wallet and wallet.user != request.user:
            raise serializers.ValidationError({"wallet": "Carteira inválida."})

        category = attrs.get("category")
        if category:
            from django.db.models import Q
            from apps.categories.models import Category
            if not Category.objects.filter(
                Q(pk=category.pk) & (Q(user=request.user) | Q(is_system=True))
            ).exists():
                raise serializers.ValidationError({"category": "Categoria inválida."})

        return attrs
