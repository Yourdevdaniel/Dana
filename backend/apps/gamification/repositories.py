from core.repositories import BaseRepository

from .models import Badge, UserBadge, XPHistory


class XPHistoryRepository(BaseRepository):
    model = XPHistory


class BadgeRepository(BaseRepository):
    model = Badge


class UserBadgeRepository(BaseRepository):
    model = UserBadge

    def user_has_badge(self, user, badge):
        return self.model.objects.filter(user=user, badge=badge).exists()
