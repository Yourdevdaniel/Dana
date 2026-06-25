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
