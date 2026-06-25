import pytest

from apps.gamification.models import XPHistory
from apps.gamification.services import XPService


@pytest.mark.django_db
class TestXPService:
    def test_award_xp_creates_history(self, user):
        svc = XPService()
        svc.award(user, 10, "transaction", "abc")
        assert XPHistory.objects.filter(user=user, reason="transaction").exists()

    def test_award_xp_updates_total(self, user):
        svc = XPService()
        svc.award(user, 50, "fixed_expense_paid")
        user.refresh_from_db()
        assert user.total_xp == 50

    def test_multiple_awards_accumulate(self, user):
        svc = XPService()
        svc.award(user, 10, "transaction")
        svc.award(user, 100, "goal_completed")
        user.refresh_from_db()
        assert user.total_xp == 110
