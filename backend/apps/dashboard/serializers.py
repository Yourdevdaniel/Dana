from rest_framework import serializers


class MonthlyTrendSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    income = serializers.DecimalField(max_digits=12, decimal_places=2)
    expense = serializers.DecimalField(max_digits=12, decimal_places=2)


class DashboardSerializer(serializers.Serializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_worth = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_average_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    recommended_reserve = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_trend = MonthlyTrendSerializer(many=True)
    financial_risk = serializers.CharField()
