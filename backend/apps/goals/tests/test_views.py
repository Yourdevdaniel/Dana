import pytest
from decimal import Decimal
from apps.goals.models import Goal


@pytest.mark.django_db
class TestGoalViews:
    url = "/api/goals/"

    def test_create_goal(self, auth_client):
        r = auth_client.post(self.url, {"name": "Casa", "target_amount": "100000.00"})
        assert r.status_code == 201
        assert r.data["data"]["status"] == "in_progress"

    def test_list_own_goals(self, auth_client, user):
        Goal.objects.create(user=user, name="Carro", target_amount=Decimal("50000"))
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 1

    def test_other_users_goals_not_visible(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o@g.com", name="O", password="pass1234")
        Goal.objects.create(user=other, name="Viagem", target_amount=Decimal("5000"))
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 0

    def test_progress_percent_in_response(self, auth_client):
        r = auth_client.post(self.url, {"name": "Meta", "target_amount": "1000.00", "current_amount": "250.00"})
        assert r.data["data"]["progress_percent"] == 25.0

    def test_negative_target_rejected(self, auth_client):
        r = auth_client.post(self.url, {"name": "Bad", "target_amount": "-100.00"})
        assert r.status_code == 400

    def test_idor_couple_group_rejected(self, auth_client, db):
        from apps.couples.models import CoupleGroup
        other_group = CoupleGroup.objects.create(name="Outros")
        r = auth_client.post(self.url, {
            "name": "IDOR", "target_amount": "1000.00",
            "couple_group": str(other_group.id),
        })
        assert r.status_code == 400


@pytest.mark.django_db
class TestGoalDepositView:
    def test_deposit_partial(self, auth_client, user):
        goal = Goal.objects.create(user=user, name="Viagem", target_amount=Decimal("10000"))
        r = auth_client.post(f"/api/goals/{goal.id}/deposit/", {"amount": "3000.00"})
        assert r.status_code == 200
        assert r.data["data"]["status"] == "in_progress"
        assert Decimal(str(r.data["data"]["current_amount"])) == Decimal("3000")

    def test_deposit_completes_goal(self, auth_client, user, mocker):
        mocker.patch("apps.users.models.User.add_xp")
        goal = Goal.objects.create(user=user, name="PC", target_amount=Decimal("5000"))
        r = auth_client.post(f"/api/goals/{goal.id}/deposit/", {"amount": "5000.00"})
        assert r.data["data"]["status"] == "completed"

    def test_deposit_other_users_goal_fails(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o@goal.com", name="O", password="pass1234")
        goal = Goal.objects.create(user=other, name="Deles", target_amount=Decimal("1000"))
        r = auth_client.post(f"/api/goals/{goal.id}/deposit/", {"amount": "100.00"})
        assert r.status_code == 404
