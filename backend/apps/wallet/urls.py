from django.urls import path

from .views import SalaryListCreateView, WalletView

urlpatterns = [
    path("", WalletView.as_view(), name="wallet"),
    path("salary/", SalaryListCreateView.as_view(), name="salary-list"),
]
