from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOwner
from core.responses import success_response

from .models import Debt
from .serializers import DebtCreateSerializer, DebtSerializer


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
        return DebtCreateSerializer if self.request.method in ("PUT", "PATCH") else DebtSerializer

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
