from rest_framework import serializers

from apps.users.models import User
from .models import Badge, UserBadge, XPHistory


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "description", "icon", "xp_reward", "condition_type"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ["id", "badge", "awarded_at"]


class XPHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = XPHistory
        fields = ["id", "amount", "reason", "reference_id", "created_at"]


class PublicUserSerializer(serializers.ModelSerializer):
    """Expõe apenas dados públicos de outros usuários — sem email nem data de nascimento."""

    class Meta:
        model = User
        fields = ["id", "name", "avatar", "total_xp"]


class RankingSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user = PublicUserSerializer()
    total_xp = serializers.IntegerField()
