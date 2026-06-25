from rest_framework import serializers

from .models import Salary, Wallet


class WalletSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Wallet
        fields = ["id", "name", "currency", "balance", "created_at"]
        read_only_fields = ["id", "balance", "created_at"]


class SalarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Salary
        fields = ["id", "amount", "effective_date", "note", "created_at"]
        read_only_fields = ["id", "created_at"]
