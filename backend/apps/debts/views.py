from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsOwner
from core.responses import error_response, success_response

from .models import Debt
from .serializers import DebtCreateSerializer, DebtSerializer, DebtUpdateSerializer


class DebtListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Debt.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return DebtCreateSerializer if self.request.method == "POST" else DebtSerializer

    def list(self, request, *args, **kwargs):
        return success_response(data=DebtSerializer(self.get_queryset(), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        debt = serializer.save(user=request.user)
        return success_response(data=DebtSerializer(debt).data, message="Dívida registrada.", status=201)


class DebtDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Debt.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return DebtUpdateSerializer if self.request.method in ("PUT", "PATCH") else DebtSerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=DebtSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=DebtSerializer(serializer.instance).data, message="Dívida atualizada.")

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return success_response(message="Dívida removida.")


class DebtPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        debt = Debt.objects.filter(pk=pk, user=request.user).first()
        if not debt:
            return error_response(message="Dívida não encontrada.", status=404)
        debt.paid_amount = debt.amount
        debt.status = Debt.StatusChoices.PAID
        debt.save(update_fields=["paid_amount", "status", "updated_at"])
        return success_response(data=DebtSerializer(debt).data, message="Dívida marcada como paga.")
