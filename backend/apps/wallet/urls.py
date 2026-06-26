from django.urls import path

from .views import AdjustBalanceView, SalaryListCreateView, WalletView

urlpatterns = [
    path("", WalletView.as_view(), name="wallet"),
    path("salary/", SalaryListCreateView.as_view(), name="salary-list"),
    path("adjust-balance/", AdjustBalanceView.as_view(), name="wallet-adjust-balance"),
]
