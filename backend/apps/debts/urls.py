from django.urls import path

from .views import DebtDetailView, DebtListCreateView

urlpatterns = [
    path("", DebtListCreateView.as_view(), name="debt-list"),
    path("<uuid:pk>/", DebtDetailView.as_view(), name="debt-detail"),
]
