from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import CoupleGroup


class CoupleGroupSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = CoupleGroup
        fields = ["id", "name", "invite_code", "members", "created_at"]
        read_only_fields = ["id", "invite_code", "created_at"]


class CoupleGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoupleGroup
        fields = ["name"]


class JoinCoupleSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=12)
