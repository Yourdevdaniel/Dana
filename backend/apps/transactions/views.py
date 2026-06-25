from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOwner
from core.responses import success_response

from .models import Transaction
from .serializers import TransactionCreateSerializer, TransactionSerializer
from .services import TransactionService


class TransactionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["type", "category", "date"]
    ordering_fields = ["date", "amount", "created_at"]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return TransactionCreateSerializer if self.request.method == "POST" else TransactionSerializer

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        return success_response(data=TransactionSerializer(qs, many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        svc = TransactionService()
        transaction = svc.create_transaction(request.user, serializer.validated_data)
        return success_response(
            data=TransactionSerializer(transaction).data,
            message="Transação criada.",
            status=201,
        )


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return TransactionCreateSerializer if self.request.method in ("PUT", "PATCH") else TransactionSerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=TransactionSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=TransactionSerializer(serializer.instance).data, message="Transação atualizada.")

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        svc = TransactionService()
        svc.delete_transaction(obj)
        return success_response(message="Transação removida.")
