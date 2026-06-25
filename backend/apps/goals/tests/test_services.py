import pytest
from decimal import Decimal

from apps.goals.models import Goal
from apps.goals.services import GoalService
from core.exceptions import BusinessException


@pytest.mark.django_db
class TestGoalService:
    def setup_method(self):
        self.svc = GoalService()

    def _goal(self, user):
        return Goal.objects.create(user=user, name="Casa", target_amount=Decimal("10000"))

    def test_deposit_partial(self, user, mocker):
        goal = self._goal(user)
        mocker.patch.object(user, "add_xp")
        goal = self.svc.deposit(user, goal, Decimal("3000"))
        assert goal.current_amount == Decimal("3000")
        assert goal.status == Goal.StatusChoices.IN_PROGRESS

    def test_deposit_completes_goal_and_awards_xp(self, user, mocker):
        goal = self._goal(user)
        mock_xp = mocker.patch.object(user, "add_xp")
        goal = self.svc.deposit(user, goal, Decimal("10000"))
        assert goal.status == Goal.StatusChoices.COMPLETED
        assert goal.current_amount == goal.target_amount
        mock_xp.assert_called_once_with(100, reason="goal_completed", reference_id=str(goal.id))

    def test_deposit_caps_at_target(self, user, mocker):
        goal = self._goal(user)
        mocker.patch.object(user, "add_xp")
        goal = self.svc.deposit(user, goal, Decimal("99999"))
        assert goal.current_amount == goal.target_amount

    def test_cancel_completed_goal_raises(self, user, mocker):
        goal = self._goal(user)
        mocker.patch.object(user, "add_xp")
        goal = self.svc.deposit(user, goal, Decimal("10000"))
        with pytest.raises(BusinessException):
            self.svc.cancel(goal)

    def test_progress_percent(self, user):
        goal = self._goal(user)
        goal.current_amount = Decimal("2500")
        assert goal.progress_percent == 25.0
