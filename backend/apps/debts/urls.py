from django.urls import path

from .views import DebtDetailView, DebtListCreateView, DebtPayView

urlpatterns = [
    path("", DebtListCreateView.as_view(), name="debt-list"),
    path("<uuid:pk>/", DebtDetailView.as_view(), name="debt-detail"),
    path("<uuid:pk>/pay/", DebtPayView.as_view(), name="debt-pay"),
]
