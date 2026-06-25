from django.urls import path

from .views import NotificationListView, NotificationReadView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("read/", NotificationReadView.as_view(), name="notification-read-all"),
    path("<uuid:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
]
