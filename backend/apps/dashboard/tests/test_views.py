import pytest
from decimal import Decimal
from apps.wallet.models import Wallet
from apps.transactions.models import Transaction


@pytest.mark.django_db
class TestDashboardView:
    url = "/api/dashboard/"

    def test_dashboard_empty(self, auth_client):
        r = auth_client.get(self.url)
        assert r.status_code == 200
        data = r.data["data"]
        assert Decimal(str(data["balance"])) == Decimal("0")
        assert data["financial_risk"] == "critical"

    def test_dashboard_with_transactions(self, auth_client, user):
        wallet = Wallet.objects.create(user=user)
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("3000"), type="income", date="2026-01-01")
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("500"), type="expense", date="2026-01-01")
        r = auth_client.get(self.url)
        data = r.data["data"]
        assert Decimal(str(data["balance"])) == Decimal("2500")
        assert "monthly_trend" in data
        assert len(data["monthly_trend"]) == 6

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401

    def test_financial_risk_levels(self, auth_client, user):
        wallet = Wallet.objects.create(user=user)
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("100000"), type="income", date="2026-01-01")
        r = auth_client.get(self.url)
        assert r.data["data"]["financial_risk"] == "low"


@pytest.mark.django_db
class TestCoupleDashboardView:
    url = "/api/dashboard/couple/"

    def test_no_couple_group(self, auth_client):
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert r.data["message"] == "Sem grupo de casal."

    def test_with_couple_group(self, auth_client, user):
        from apps.couples.models import CoupleGroup
        group = CoupleGroup.objects.create(name="Casal")
        user.couple_group = group
        user.save()
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert isinstance(r.data["data"], list)
        assert len(r.data["data"]) == 1
