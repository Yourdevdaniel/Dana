from django.urls import path

from .views import CreditCardDetailView, CreditCardListCreateView

urlpatterns = [
    path("", CreditCardListCreateView.as_view(), name="credit-card-list"),
    path("<uuid:pk>/", CreditCardDetailView.as_view(), name="credit-card-detail"),
]
