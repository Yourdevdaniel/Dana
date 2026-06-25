import pytest
from decimal import Decimal
from apps.fixed_expenses.models import FixedExpense


@pytest.mark.django_db
class TestFixedExpenseViews:
    url = "/api/fixed-expenses/"

    def test_create(self, auth_client):
        r = auth_client.post(self.url, {"name": "Aluguel", "amount": "1500.00", "due_day": 5})
        assert r.status_code == 201
        assert r.data["data"]["is_paid_this_month"] is False

    def test_list_own(self, auth_client, user):
        FixedExpense.objects.create(user=user, name="Internet", amount=Decimal("100"), due_day=10)
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 1

    def test_invalid_due_day(self, auth_client):
        r = auth_client.post(self.url, {"name": "X", "amount": "100.00", "due_day": 0})
        assert r.status_code == 400
        r2 = auth_client.post(self.url, {"name": "X", "amount": "100.00", "due_day": 32})
        assert r2.status_code == 400

    def test_mark_as_paid(self, auth_client, user, mocker):
        mocker.patch("apps.users.models.User.add_xp")
        expense = FixedExpense.objects.create(user=user, name="Luz", amount=Decimal("200"), due_day=15)
        r = auth_client.post(f"/api/fixed-expenses/{expense.id}/pay/")
        assert r.status_code == 200
        expense.refresh_from_db()
        assert expense.is_paid_this_month is True
        assert expense.last_paid_at is not None

    def test_cannot_pay_other_users_expense(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o@fe.com", name="O", password="pass1234")
        expense = FixedExpense.objects.create(user=other, name="Academia", amount=Decimal("100"), due_day=1)
        r = auth_client.post(f"/api/fixed-expenses/{expense.id}/pay/")
        assert r.status_code == 404
