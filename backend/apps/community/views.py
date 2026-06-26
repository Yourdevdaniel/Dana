from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.users.models import User
from core.responses import error_response, success_response

from . import services
from .models import CommunityNudge, Friendship
from .serializers import (
    FriendRequestSerializer,
    FriendshipSerializer,
    NudgeSerializer,
    SendFriendRequestSerializer,
    SendNudgeSerializer,
)


class FriendListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friendships = services.get_accepted_friendships(request.user)
        data = FriendshipSerializer(
            friendships, many=True, context={"request_user": request.user}
        ).data
        return success_response(data=data)


class FriendRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending = Friendship.objects.filter(
            receiver=request.user,
            status=Friendship.StatusChoices.PENDING,
        ).select_related("requester", "requester__couple_group")
        return success_response(data=FriendRequestSerializer(pending, many=True).data)

    def post(self, request):
        serializer = SendFriendRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        to_id = serializer.validated_data["to_user_id"]

        if str(to_id) == str(request.user.id):
            return error_response(message="Você não pode enviar pedido para si mesmo.", status=400)

        try:
            receiver = User.objects.get(pk=to_id, is_active=True)
        except User.DoesNotExist:
            return error_response(message="Usuário não encontrado.", status=404)

        existing = Friendship.objects.filter(
            Q(requester=request.user, receiver=receiver) |
            Q(requester=receiver, receiver=request.user)
        ).first()

        if existing:
            if existing.status == Friendship.StatusChoices.ACCEPTED:
                return error_response(message="Vocês já são amigos.", status=400)
            if existing.status == Friendship.StatusChoices.PENDING:
                return error_response(message="Pedido já enviado.", status=400)
            if existing.status == Friendship.StatusChoices.REJECTED:
                existing.status = Friendship.StatusChoices.PENDING
                existing.requester = request.user
                existing.receiver = receiver
                existing.save(update_fields=["status", "requester", "receiver", "updated_at"])
                return success_response(
                    data=FriendRequestSerializer(existing).data,
                    message="Pedido de amizade reenviado.",
                    status=201,
                )

        friendship = Friendship.objects.create(requester=request.user, receiver=receiver)
        return success_response(
            data=FriendRequestSerializer(friendship).data,
            message="Pedido de amizade enviado.",
            status=201,
        )


class FriendRequestAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        friendship = Friendship.objects.filter(
            pk=pk, receiver=request.user, status=Friendship.StatusChoices.PENDING
        ).first()
        if not friendship:
            return error_response(message="Pedido não encontrado.", status=404)
        friendship.status = Friendship.StatusChoices.ACCEPTED
        friendship.save(update_fields=["status", "updated_at"])
        return success_response(
            data=FriendshipSerializer(friendship, context={"request_user": request.user}).data,
            message="Amizade aceita.",
        )


class FriendRequestRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        friendship = Friendship.objects.filter(
            pk=pk, receiver=request.user, status=Friendship.StatusChoices.PENDING
        ).first()
        if not friendship:
            return error_response(message="Pedido não encontrado.", status=404)
        friendship.status = Friendship.StatusChoices.REJECTED
        friendship.save(update_fields=["status", "updated_at"])
        return success_response(message="Pedido recusado.")


class FriendDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        friendship = Friendship.objects.filter(
            Q(requester=request.user) | Q(receiver=request.user),
            pk=pk,
            status=Friendship.StatusChoices.ACCEPTED,
        ).first()
        if not friendship:
            return error_response(message="Amizade não encontrada.", status=404)
        friendship.delete()
        return success_response(message="Amizade removida.")


class NudgeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        services.deliver_pending_nudges()
        nudges = CommunityNudge.objects.filter(
            Q(sender=request.user) | Q(receiver=request.user)
        ).select_related("sender", "receiver")
        return success_response(data=NudgeSerializer(nudges, many=True).data)

    def post(self, request):
        serializer = SendNudgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        to_id = serializer.validated_data["to_user_id"]

        try:
            receiver = User.objects.get(pk=to_id, is_active=True)
        except User.DoesNotExist:
            return error_response(message="Usuário não encontrado.", status=404)

        if not services.are_friends(request.user, receiver):
            return error_response(message="Você só pode enviar incentivos para amigos.", status=403)

        nudge = CommunityNudge.objects.create(
            sender=request.user,
            receiver=receiver,
            message=serializer.validated_data["message"],
            deliver_at=serializer.validated_data["deliver_at"],
        )
        services.deliver_pending_nudges()
        nudge.refresh_from_db()
        return success_response(
            data=NudgeSerializer(nudge).data,
            message="Incentivo agendado.",
            status=201,
        )
