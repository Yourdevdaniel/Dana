from django.urls import path

from .views import InvestmentDetailView, InvestmentListCreateView, InvestmentSummaryView

urlpatterns = [
    path("", InvestmentListCreateView.as_view(), name="investment-list"),
    path("summary/", InvestmentSummaryView.as_view(), name="investment-summary"),
    path("<uuid:pk>/", InvestmentDetailView.as_view(), name="investment-detail"),
]
