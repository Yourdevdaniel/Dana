from decimal import Decimal

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import error_response, success_response

from .models import Salary, Wallet
from .serializers import SalarySerializer, WalletSerializer
from .services import SalaryService, WalletService


class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        svc = WalletService()
        wallet = svc.get_or_create_wallet(request.user)
        return success_response(data=WalletSerializer(wallet).data)


class SalaryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SalarySerializer

    def get_queryset(self):
        return Salary.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        return success_response(data=SalarySerializer(self.get_queryset(), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        svc = SalaryService()
        salary = svc.register(request.user, serializer.validated_data)
        return success_response(data=SalarySerializer(salary).data, message="Salário registrado.", status=201)


class AdjustBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            target = Decimal(str(request.data.get("target_balance", "")))
        except Exception:
            return error_response(message="target_balance inválido.", status=400)

        svc = WalletService()
        wallet = svc.get_or_create_wallet(request.user)
        current = wallet.balance
        diff = target - current

        if diff == 0:
            return success_response(data=WalletSerializer(wallet).data, message="Saldo já está correto.")

        from apps.transactions.services import TransactionService
        from apps.categories.models import Category
        import datetime

        tx_type = "income" if diff > 0 else "expense"
        amount = abs(diff)
        category = Category.objects.filter(is_system=True, type=tx_type).first()

        TransactionService().create_transaction(request.user, {
            "wallet": wallet,
            "amount": amount,
            "type": tx_type,
            "description": "Ajuste de saldo",
            "date": datetime.date.today(),
            "category": category,
        })

        wallet.refresh_from_db()
        return success_response(data=WalletSerializer(wallet).data, message="Saldo ajustado.")
