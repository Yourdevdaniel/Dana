from rest_framework import serializers

from .models import Goal


class GoalSerializer(serializers.ModelSerializer):
    progress_percent = serializers.FloatField(read_only=True)

    class Meta:
        model = Goal
        fields = [
            "id", "name", "target_amount", "current_amount", "deadline",
            "status", "progress_percent", "couple_group", "created_at",
        ]
        read_only_fields = ["id", "status", "progress_percent", "created_at"]


class GoalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = ["name", "target_amount", "current_amount", "deadline", "couple_group"]

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Valor alvo deve ser positivo.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        couple_group = attrs.get("couple_group")
        if couple_group and request:
            if request.user.couple_group is None or request.user.couple_group.pk != couple_group.pk:
                raise serializers.ValidationError({"couple_group": "Grupo de casal inválido."})
        return attrs


class GoalDepositSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Valor deve ser positivo.")
        return value
