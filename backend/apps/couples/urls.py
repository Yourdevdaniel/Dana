from django.urls import path

from .views import CoupleGroupView, JoinCoupleView

urlpatterns = [
    path("", CoupleGroupView.as_view(), name="couple-group"),
    path("join/", JoinCoupleView.as_view(), name="couple-join"),
]
