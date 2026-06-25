from core.exceptions import BusinessException
from core.services import BaseService

from .models import Goal
from .repositories import GoalRepository

XP_GOAL_COMPLETED = 100


class GoalService(BaseService):
    repository_class = GoalRepository

    def deposit(self, user, goal: Goal, amount):
        goal.current_amount += amount
        if goal.current_amount >= goal.target_amount:
            goal.current_amount = goal.target_amount
            goal.status = Goal.StatusChoices.COMPLETED
            goal.save()
            user.add_xp(XP_GOAL_COMPLETED, reason="goal_completed", reference_id=str(goal.id))
        else:
            goal.save(update_fields=["current_amount", "updated_at"])
        return goal

    def cancel(self, goal: Goal):
        if goal.status == Goal.StatusChoices.COMPLETED:
            raise BusinessException("Meta já concluída não pode ser cancelada.")
        goal.status = Goal.StatusChoices.CANCELLED
        goal.save(update_fields=["status", "updated_at"])
        return goal
