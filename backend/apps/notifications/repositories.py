from core.repositories import BaseRepository

from .models import Notification


class NotificationRepository(BaseRepository):
    model = Notification

    def mark_all_read(self, user):
        self.model.objects.filter(user=user, is_read=False).update(is_read=True)
