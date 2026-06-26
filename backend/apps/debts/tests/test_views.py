import pytest
from decimal import Decimal
from apps.debts.models import Debt


@pytest.mark.django_db
class TestDebtViews:
    url = "/api/debts/"

    def test_create_debt(self, auth_client):
        r = auth_client.post(self.url, {"creditor": "Banco", "amount": "5000.00"})
        assert r.status_code == 201
        assert r.data["data"]["status"] == "pending"

    def test_list_own_debts(self, auth_client, user):
        Debt.objects.create(user=user, creditor="Nubank", amount=Decimal("1000"))
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 1

    def test_other_users_debts_not_visible(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o@d.com", name="O", password="pass1234")
        Debt.objects.create(user=other, creditor="Banco X", amount=Decimal("999"))
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 0

    def test_remaining_field(self, auth_client):
        r = auth_client.post(self.url, {"creditor": "Cred", "amount": "1000.00", "paid_amount": "300.00"})
        assert Decimal(str(r.data["data"]["remaining"])) == Decimal("700")

    def test_remaining_clamped_to_zero_when_overpaid(self, auth_client, user):
        debt = Debt.objects.create(user=user, creditor="C", amount=Decimal("100"), paid_amount=Decimal("150"))
        assert debt.remaining == 0

    def test_negative_amount_rejected(self, auth_client):
        r = auth_client.post(self.url, {"creditor": "X", "amount": "-100.00"})
        assert r.status_code == 400

    def test_delete_own_debt(self, auth_client, user):
        debt = Debt.objects.create(user=user, creditor="Y", amount=Decimal("500"))
        r = auth_client.delete(f"/api/debts/{debt.id}/")
        assert r.status_code == 200
        assert not Debt.objects.filter(pk=debt.id).exists()

    def test_cannot_delete_other_users_debt(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o2@d.com", name="O2", password="pass1234")
        debt = Debt.objects.create(user=other, creditor="Z", amount=Decimal("200"))
        r = auth_client.delete(f"/api/debts/{debt.id}/")
        assert r.status_code in (403, 404)

    def test_patch_sets_status_paid_when_fully_paid(self, auth_client, user):
        debt = Debt.objects.create(user=user, creditor="Banco", amount=Decimal("500"))
        r = auth_client.patch(f"/api/debts/{debt.id}/", {"paid_amount": "500.00"})
        assert r.status_code == 200
        assert r.data["data"]["status"] == "paid"

    def test_patch_accepts_explicit_status(self, auth_client, user):
        debt = Debt.objects.create(user=user, creditor="Banco", amount=Decimal("300"))
        r = auth_client.patch(f"/api/debts/{debt.id}/", {"status": "overdue"})
        assert r.status_code == 200
        assert r.data["data"]["status"] == "overdue"


@pytest.mark.django_db
class TestDebtPayEndpoint:
    def test_pay_marks_debt_as_paid(self, auth_client, user):
        debt = Debt.objects.create(user=user, creditor="Banco", amount=Decimal("1000"))
        r = auth_client.post(f"/api/debts/{debt.id}/pay/")
        assert r.status_code == 200
        assert r.data["data"]["status"] == "paid"
        assert Decimal(r.data["data"]["paid_amount"]) == Decimal("1000")
        assert Decimal(r.data["data"]["remaining"]) == Decimal("0")

    def test_pay_other_users_debt_not_found(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o3@d.com", name="O3", password="pass1234")
        debt = Debt.objects.create(user=other, creditor="Banco", amount=Decimal("500"))
        r = auth_client.post(f"/api/debts/{debt.id}/pay/")
        assert r.status_code == 404
