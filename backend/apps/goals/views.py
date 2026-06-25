from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.exceptions import BusinessException
from core.permissions import IsOwner
from core.responses import error_response, success_response

from .models import Goal
from .serializers import GoalCreateSerializer, GoalDepositSerializer, GoalSerializer
from .services import GoalService


class GoalListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return GoalCreateSerializer if self.request.method == "POST" else GoalSerializer

    def list(self, request, *args, **kwargs):
        return success_response(data=GoalSerializer(self.get_queryset(), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        goal = serializer.save(user=request.user)
        return success_response(data=GoalSerializer(goal).data, message="Meta criada.", status=201)


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return GoalCreateSerializer if self.request.method in ("PUT", "PATCH") else GoalSerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=GoalSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=GoalSerializer(serializer.instance).data, message="Meta atualizada.")

    def destroy(self, request, *args, **kwargs):
        try:
            GoalService().cancel(self.get_object())
            return success_response(message="Meta cancelada.")
        except BusinessException as e:
            return error_response(message=e.message, status=e.status_code)


class GoalDepositView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        goal = Goal.objects.filter(pk=pk, user=request.user).first()
        if not goal:
            return error_response(message="Meta não encontrada.", status=404)
        serializer = GoalDepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        svc = GoalService()
        goal = svc.deposit(request.user, goal, serializer.validated_data["amount"])
        return success_response(data=GoalSerializer(goal).data, message="Depósito realizado.")
