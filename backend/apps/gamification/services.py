from django.db.models import Sum
from django.utils import timezone

from apps.users.models import User

from .models import Badge, UserBadge, XPHistory
from .repositories import BadgeRepository, UserBadgeRepository, XPHistoryRepository


class XPService:
    def __init__(self):
        self.xp_repo = XPHistoryRepository()
        self.badge_repo = BadgeRepository()
        self.user_badge_repo = UserBadgeRepository()

    def award(self, user: User, amount: int, reason: str, reference_id: str = ""):
        self.xp_repo.create(user=user, amount=amount, reason=reason, reference_id=reference_id)
        User.objects.filter(pk=user.pk).update(total_xp=user.total_xp + amount)
        user.total_xp += amount
        self._check_badges(user)

    def _check_badges(self, user: User):
        badges = self.badge_repo.list(condition_type="xp_threshold")
        for badge in badges:
            if user.total_xp >= badge.condition_value:
                if not self.user_badge_repo.user_has_badge(user, badge):
                    UserBadge.objects.create(user=user, badge=badge)


class RankingService:
    def get_ranking(self, period: str = "general", couple_group=None):
        qs = User.objects.filter(is_active=True)
        if couple_group:
            qs = qs.filter(couple_group=couple_group)

        if period == "general":
            users = qs.order_by("-total_xp")[:10]
            return [
                {"rank": idx + 1, "user": u, "total_xp": u.total_xp}
                for idx, u in enumerate(users)
            ]

        since = self._period_start(period)
        user_xp = (
            XPHistory.objects.filter(user__in=qs, created_at__gte=since)
            .values("user")
            .annotate(period_xp=Sum("amount"))
            .order_by("-period_xp")[:10]
        )
        user_map = {u.pk: u for u in qs}
        return [
            {
                "rank": idx + 1,
                "user": user_map[row["user"]],
                "total_xp": row["period_xp"],
            }
            for idx, row in enumerate(user_xp)
            if row["user"] in user_map
        ]

    @staticmethod
    def _period_start(period: str):
        now = timezone.now()
        if period == "weekly":
            return now - timezone.timedelta(days=7)
        if period == "monthly":
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return now.replace(year=2000, month=1, day=1)
