from django.urls import path

from .views import MeView, PrivacyView, ProfileDetailView, ProfileListView

urlpatterns = [
    path("me/", MeView.as_view(), name="user-me"),
    path("me/privacy/", PrivacyView.as_view(), name="user-privacy"),
    path("profiles/", ProfileListView.as_view(), name="user-profile-list"),
    path("profiles/<uuid:pk>/", ProfileDetailView.as_view(), name="user-profile-detail"),
]
