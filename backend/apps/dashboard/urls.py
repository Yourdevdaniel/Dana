from django.urls import path

from .views import CoupleDashboardView, DashboardView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("couple/", CoupleDashboardView.as_view(), name="dashboard-couple"),
]
