from django.urls import path

from .views import GoalDepositView, GoalDetailView, GoalListCreateView

urlpatterns = [
    path("", GoalListCreateView.as_view(), name="goal-list"),
    path("<uuid:pk>/", GoalDetailView.as_view(), name="goal-detail"),
    path("<uuid:pk>/deposit/", GoalDepositView.as_view(), name="goal-deposit"),
]
