from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.exceptions import BusinessException
from core.responses import error_response, success_response

from .serializers import CoupleGroupCreateSerializer, CoupleGroupSerializer, JoinCoupleSerializer
from .services import CoupleGroupService


class CoupleGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.couple_group:
            return success_response(data=None, message="Sem grupo de casal.")
        serializer = CoupleGroupSerializer(request.user.couple_group)
        return success_response(data=serializer.data)

    def post(self, request):
        serializer = CoupleGroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            svc = CoupleGroupService()
            group = svc.create_group(request.user, serializer.validated_data["name"])
            return success_response(
                data=CoupleGroupSerializer(group).data,
                message="Grupo criado com sucesso.",
                status=201,
            )
        except BusinessException as e:
            return error_response(message=e.message, status=e.status_code)

    def delete(self, request):
        try:
            CoupleGroupService().leave_group(request.user)
            return success_response(message="Você saiu do grupo.")
        except BusinessException as e:
            return error_response(message=e.message, status=e.status_code)


class JoinCoupleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinCoupleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            svc = CoupleGroupService()
            group = svc.join_group(request.user, serializer.validated_data["invite_code"])
            return success_response(
                data=CoupleGroupSerializer(group).data,
                message="Entrou no grupo com sucesso.",
            )
        except BusinessException as e:
            return error_response(message=e.message, status=e.status_code)
