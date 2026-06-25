from django.urls import path

from .views import MeView, ProfileListView, ProfileDetailView

urlpatterns = [
    path("me/", MeView.as_view(), name="user-me"),
    path("profiles/", ProfileListView.as_view(), name="user-profile-list"),
    path("profiles/<uuid:pk>/", ProfileDetailView.as_view(), name="user-profile-detail"),
]
