import datetime

from django.db import transaction as db_transaction
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsOwner
from core.responses import success_response

from . import services
from .models import Investment
from .serializers import InvestmentCreateSerializer, InvestmentSerializer, InvestmentUpdateSerializer


class InvestmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return InvestmentCreateSerializer if self.request.method == "POST" else InvestmentSerializer

    def list(self, request, *args, **kwargs):
        return success_response(data=InvestmentSerializer(self.get_queryset(), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            investment = serializer.save(user=request.user)
            self._debit_wallet(request.user, investment)

        return success_response(
            data=InvestmentSerializer(investment).data,
            message="Investimento registrado.",
            status=201,
        )

    def _debit_wallet(self, user, investment):
        from apps.wallet.services import WalletService
        from apps.transactions.services import TransactionService
        from apps.categories.models import Category

        wallet = WalletService().get_or_create_wallet(user)
        category = Category.objects.filter(is_system=True, type="expense").first()
        TransactionService().create_transaction(user, {
            "wallet": wallet,
            "amount": investment.invested_amount,
            "type": "expense",
            "description": f"Investimento - {investment.name}",
            "date": investment.purchase_date or datetime.date.today(),
            "category": category,
        })


class InvestmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return InvestmentUpdateSerializer if self.request.method in ("PUT", "PATCH") else InvestmentSerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=InvestmentSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            data=InvestmentSerializer(serializer.instance).data,
            message="Investimento atualizado.",
        )

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return success_response(message="Investimento removido.")


class InvestmentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = services.get_summary(request.user)
        return success_response(data=summary)
