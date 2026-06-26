from rest_framework import serializers

from apps.users.serializers import PublicProfileSerializer

from .models import CommunityNudge, Friendship


class FriendshipSerializer(serializers.ModelSerializer):
    friend = serializers.SerializerMethodField()

    class Meta:
        model = Friendship
        fields = ["id", "friend", "status", "created_at"]
        read_only_fields = fields

    def get_friend(self, obj):
        request_user = self.context.get("request_user")
        other = obj.receiver if obj.requester_id == (request_user.id if request_user else None) else obj.requester
        return PublicProfileSerializer(other).data


class FriendRequestSerializer(serializers.ModelSerializer):
    requester = PublicProfileSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ["id", "requester", "status", "created_at"]
        read_only_fields = fields


class SendFriendRequestSerializer(serializers.Serializer):
    to_user_id = serializers.UUIDField()


class NudgeSerializer(serializers.ModelSerializer):
    sender = PublicProfileSerializer(read_only=True)
    receiver = PublicProfileSerializer(read_only=True)

    class Meta:
        model = CommunityNudge
        fields = ["id", "sender", "receiver", "message", "deliver_at", "delivered_at", "status", "created_at"]
        read_only_fields = fields


class SendNudgeSerializer(serializers.Serializer):
    to_user_id = serializers.UUIDField()
    message = serializers.CharField(max_length=200)
    deliver_at = serializers.DateTimeField()

    def validate_message(self, value):
        if value not in CommunityNudge.ALLOWED_MESSAGES:
            allowed = ", ".join(f'"{m}"' for m in CommunityNudge.ALLOWED_MESSAGES)
            raise serializers.ValidationError(f"Mensagem não permitida. Use: {allowed}")
        return value

    def validate_deliver_at(self, value):
        from django.utils import timezone
        if value < timezone.now() - timezone.timedelta(minutes=5):
            raise serializers.ValidationError("Data de entrega não pode estar no passado.")
        return value
