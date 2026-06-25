from django.urls import path

from .views import FixedExpenseDetailView, FixedExpenseListCreateView, FixedExpensePayView

urlpatterns = [
    path("", FixedExpenseListCreateView.as_view(), name="fixed-expense-list"),
    path("<uuid:pk>/", FixedExpenseDetailView.as_view(), name="fixed-expense-detail"),
    path("<uuid:pk>/pay/", FixedExpensePayView.as_view(), name="fixed-expense-pay"),
]
