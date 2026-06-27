import pytest
from decimal import Decimal

from apps.wallet.models import Salary, Wallet


@pytest.mark.django_db
class TestWalletView:
    url = "/api/wallet/"

    def test_get_creates_wallet_if_missing(self, auth_client, user):
        assert not Wallet.objects.filter(user=user).exists()
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert r.data["success"] is True
        assert Wallet.objects.filter(user=user).exists()

    def test_get_returns_existing_wallet(self, auth_client, user):
        Wallet.objects.create(user=user, name="Minha Carteira")
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert r.data["data"]["name"] == "Minha Carteira"

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401

    def test_balance_reflects_transactions(self, auth_client, user):
        wallet = Wallet.objects.create(user=user)
        from apps.transactions.models import Transaction
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("500"), type="income", date="2026-01-01")
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("200"), type="expense", date="2026-01-02")
        r = auth_client.get(self.url)
        assert Decimal(str(r.data["data"]["balance"])) == Decimal("300")

    def test_balance_excludes_soft_deleted_transactions(self, auth_client, user):
        wallet = Wallet.objects.create(user=user)
        from apps.transactions.models import Transaction
        tx = Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("1000"), type="income", date="2026-01-01")
        tx.soft_delete()
        r = auth_client.get(self.url)
        assert Decimal(str(r.data["data"]["balance"])) == Decimal("0")


@pytest.mark.django_db
class TestSalaryView:
    url = "/api/wallet/salary/"

    def test_create_salary(self, auth_client):
        r = auth_client.post(self.url, {"amount": "5000.00", "effective_date": "2026-01-01"})
        assert r.status_code == 201
        assert r.data["success"] is True

    def test_list_salary(self, auth_client, user):
        Salary.objects.create(user=user, amount=Decimal("3000"), effective_date="2026-01-01")
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) == 1

    def test_other_users_salary_not_visible(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="other@t.com", name="Other", password="pass1234")
        Salary.objects.create(user=other, amount=Decimal("9999"), effective_date="2026-01-01")
        r = auth_client.get(self.url)
        assert r.data["data"] == []


@pytest.mark.django_db
class TestSalaryDetailView:
    def _url(self, pk):
        return f"/api/wallet/salary/{pk}/"

    def test_patch_amount(self, auth_client, user):
        salary = Salary.objects.create(user=user, amount=Decimal("3000"), effective_date="2026-01-01")
        r = auth_client.patch(self._url(salary.id), {"amount": "4000.00"})
        assert r.status_code == 200
        salary.refresh_from_db()
        assert salary.amount == Decimal("4000.00")

    def test_patch_effective_date(self, auth_client, user):
        salary = Salary.objects.create(user=user, amount=Decimal("3000"), effective_date="2026-01-01")
        r = auth_client.patch(self._url(salary.id), {"effective_date": "2026-06-01"})
        assert r.status_code == 200
        salary.refresh_from_db()
        assert str(salary.effective_date) == "2026-06-01"

    def test_patch_note(self, auth_client, user):
        salary = Salary.objects.create(user=user, amount=Decimal("3000"), effective_date="2026-01-01")
        r = auth_client.patch(self._url(salary.id), {"note": "Aumento anual"})
        assert r.status_code == 200
        salary.refresh_from_db()
        assert salary.note == "Aumento anual"

    def test_delete_salary(self, auth_client, user):
        salary = Salary.objects.create(user=user, amount=Decimal("3000"), effective_date="2026-01-01")
        r = auth_client.delete(self._url(salary.id))
        assert r.status_code == 200
        assert not Salary.objects.filter(pk=salary.id).exists()

    def test_cannot_patch_other_users_salary(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="other2@t.com", name="Other", password="pass1234")
        salary = Salary.objects.create(user=other, amount=Decimal("5000"), effective_date="2026-01-01")
        r = auth_client.patch(self._url(salary.id), {"amount": "9999.00"})
        assert r.status_code in (403, 404)

    def test_cannot_delete_other_users_salary(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="other3@t.com", name="Other", password="pass1234")
        salary = Salary.objects.create(user=other, amount=Decimal("5000"), effective_date="2026-01-01")
        r = auth_client.delete(self._url(salary.id))
        assert r.status_code in (403, 404)

    def test_returns_envelope_format(self, auth_client, user):
        salary = Salary.objects.create(user=user, amount=Decimal("3000"), effective_date="2026-01-01")
        r = auth_client.patch(self._url(salary.id), {"note": "ok"})
        assert "success" in r.data
        assert "data" in r.data


@pytest.mark.django_db
class TestAdjustBalanceView:
    url = "/api/wallet/adjust-balance/"

    def test_adjust_balance_up_creates_income(self, auth_client, user):
        from apps.transactions.models import Transaction
        wallet = Wallet.objects.create(user=user)
        r = auth_client.post(self.url, {"target_balance": "1000.00"})
        assert r.status_code == 200
        assert Decimal(str(r.data["data"]["balance"])) == Decimal("1000.00")
        assert Transaction.objects.filter(wallet=wallet, type="income", description="Ajuste de saldo").exists()

    def test_adjust_balance_down_creates_expense(self, auth_client, user):
        from apps.transactions.models import Transaction
        wallet = Wallet.objects.create(user=user)
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("500"), type="income", date="2026-01-01")
        r = auth_client.post(self.url, {"target_balance": "200.00"})
        assert r.status_code == 200
        assert Decimal(str(r.data["data"]["balance"])) == Decimal("200.00")
        assert Transaction.objects.filter(wallet=wallet, type="expense", description="Ajuste de saldo").exists()

    def test_adjust_balance_same_returns_success(self, auth_client, user):
        Wallet.objects.create(user=user)
        r = auth_client.post(self.url, {"target_balance": "0"})
        assert r.status_code == 200

    def test_adjust_balance_invalid_value(self, auth_client, user):
        Wallet.objects.create(user=user)
        r = auth_client.post(self.url, {"target_balance": "abc"})
        assert r.status_code == 400

    def test_requires_auth(self, api_client):
        r = api_client.post(self.url, {"target_balance": "100"})
        assert r.status_code == 401
