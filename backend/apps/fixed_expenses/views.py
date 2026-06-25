from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsOwner
from core.responses import error_response, success_response

from .models import FixedExpense
from .serializers import FixedExpenseCreateSerializer, FixedExpenseSerializer
from .services import FixedExpenseService


class FixedExpenseListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FixedExpense.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return FixedExpenseCreateSerializer if self.request.method == "POST" else FixedExpenseSerializer

    def list(self, request, *args, **kwargs):
        return success_response(data=FixedExpenseSerializer(self.get_queryset(), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save(user=request.user)
        return success_response(data=FixedExpenseSerializer(expense).data, message="Conta fixa criada.", status=201)


class FixedExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return FixedExpense.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return FixedExpenseCreateSerializer if self.request.method in ("PUT", "PATCH") else FixedExpenseSerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=FixedExpenseSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=FixedExpenseSerializer(serializer.instance).data, message="Conta fixa atualizada.")

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return success_response(message="Conta fixa removida.")


class FixedExpensePayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = FixedExpense.objects.filter(pk=pk, user=request.user).first()
        if not expense:
            return error_response(message="Conta fixa não encontrada.", status=404)
        svc = FixedExpenseService()
        expense = svc.mark_paid(request.user, expense)
        return success_response(data=FixedExpenseSerializer(expense).data, message="Conta marcada como paga.")
