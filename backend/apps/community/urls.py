from django.urls import path

from .views import (
    FriendDeleteView,
    FriendListView,
    FriendRequestAcceptView,
    FriendRequestListCreateView,
    FriendRequestRejectView,
    NudgeListCreateView,
)

urlpatterns = [
    path("friends/", FriendListView.as_view(), name="community-friends"),
    path("friends/<uuid:pk>/", FriendDeleteView.as_view(), name="community-friend-delete"),
    path("friend-requests/", FriendRequestListCreateView.as_view(), name="community-friend-requests"),
    path("friend-requests/<uuid:pk>/accept/", FriendRequestAcceptView.as_view(), name="community-friend-accept"),
    path("friend-requests/<uuid:pk>/reject/", FriendRequestRejectView.as_view(), name="community-friend-reject"),
    path("nudges/", NudgeListCreateView.as_view(), name="community-nudges"),
]
