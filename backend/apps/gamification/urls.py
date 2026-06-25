from django.urls import path

from .views import BadgesView, RankingView, XPHistoryView

urlpatterns = [
    path("xp/", XPHistoryView.as_view(), name="xp-history"),
    path("badges/", BadgesView.as_view(), name="badges"),
    path("ranking/", RankingView.as_view(), name="ranking"),
]
