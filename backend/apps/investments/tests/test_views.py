import pytest
from decimal import Decimal

from apps.investments.models import Investment


@pytest.mark.django_db
class TestInvestmentViews:
    url = "/api/investments/"

    def _payload(self, **kwargs):
        base = {
            "name": "Tesouro Selic",
            "asset_type": "renda_fixa",
            "institution": "NuInvest",
            "invested_amount": "1000.00",
            "current_amount": "1040.00",
            "monthly_contribution": "200.00",
            "purchase_date": "2026-06-26",
        }
        base.update(kwargs)
        return base

    def test_create_investment(self, auth_client):
        r = auth_client.post(self.url, self._payload())
        assert r.status_code == 201
        assert r.data["data"]["name"] == "Tesouro Selic"

    def test_current_amount_defaults_to_invested_amount(self, auth_client):
        payload = self._payload()
        del payload["current_amount"]
        r = auth_client.post(self.url, payload)
        assert r.status_code == 201
        assert Decimal(r.data["data"]["current_amount"]) == Decimal("1000.00")

    def test_list_own_investments(self, auth_client, user):
        Investment.objects.create(
            user=user,
            name="PETR4",
            asset_type="acoes",
            invested_amount=Decimal("500"),
            current_amount=Decimal("520"),
            purchase_date="2026-01-01",
        )
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) == 1

    def test_other_users_investments_not_visible(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="other@inv.com", name="Other", password="pass1234")
        Investment.objects.create(
            user=other,
            name="Ouro",
            asset_type="outros",
            invested_amount=Decimal("300"),
            current_amount=Decimal("300"),
            purchase_date="2026-01-01",
        )
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 0

    def test_invested_amount_must_be_positive(self, auth_client):
        r = auth_client.post(self.url, self._payload(invested_amount="-100.00"))
        assert r.status_code == 400

    def test_current_amount_cannot_be_negative(self, auth_client):
        r = auth_client.post(self.url, self._payload(current_amount="-1.00"))
        assert r.status_code == 400

    def test_monthly_contribution_cannot_be_negative(self, auth_client):
        r = auth_client.post(self.url, self._payload(monthly_contribution="-50.00"))
        assert r.status_code == 400

    def test_patch_investment(self, auth_client, user):
        inv = Investment.objects.create(
            user=user,
            name="Old Name",
            asset_type="fundos",
            invested_amount=Decimal("2000"),
            current_amount=Decimal("2100"),
            purchase_date="2026-03-01",
        )
        r = auth_client.patch(f"/api/investments/{inv.id}/", {"name": "New Name"})
        assert r.status_code == 200
        assert r.data["data"]["name"] == "New Name"

    def test_delete_own_investment(self, auth_client, user):
        inv = Investment.objects.create(
            user=user,
            name="Del",
            asset_type="cripto",
            invested_amount=Decimal("100"),
            current_amount=Decimal("110"),
            purchase_date="2026-04-01",
        )
        r = auth_client.delete(f"/api/investments/{inv.id}/")
        assert r.status_code == 200
        assert not Investment.objects.filter(pk=inv.id).exists()

    def test_cannot_delete_other_users_investment(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o3@inv.com", name="O3", password="pass1234")
        inv = Investment.objects.create(
            user=other,
            name="Protected",
            asset_type="exterior",
            invested_amount=Decimal("500"),
            current_amount=Decimal("500"),
            purchase_date="2026-05-01",
        )
        r = auth_client.delete(f"/api/investments/{inv.id}/")
        assert r.status_code in (403, 404)


@pytest.mark.django_db
class TestInvestmentSummary:
    url = "/api/investments/summary/"

    def test_summary_empty(self, auth_client):
        r = auth_client.get(self.url)
        assert r.status_code == 200
        data = r.data["data"]
        assert data["total_invested"] == "0.00"
        assert data["total_current"] == "0.00"
        assert data["result"] == "0.00"
        assert data["profitability_percent"] == "0.00"

    def test_summary_with_investments(self, auth_client, user):
        Investment.objects.create(
            user=user,
            name="A",
            asset_type="renda_fixa",
            invested_amount=Decimal("1000"),
            current_amount=Decimal("1040"),
            monthly_contribution=Decimal("200"),
            purchase_date="2026-01-01",
        )
        Investment.objects.create(
            user=user,
            name="B",
            asset_type="acoes",
            invested_amount=Decimal("500"),
            current_amount=Decimal("480"),
            monthly_contribution=Decimal("100"),
            purchase_date="2026-02-01",
        )
        r = auth_client.get(self.url)
        data = r.data["data"]
        assert Decimal(data["total_invested"]) == Decimal("1500")
        assert Decimal(data["total_current"]) == Decimal("1520")
        assert Decimal(data["result"]) == Decimal("20")
        assert Decimal(data["monthly_contribution"]) == Decimal("300")
        assert len(data["by_type"]) == 2
        assert len(data["evolution"]) == 2

    def test_summary_excludes_other_users(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o4@inv.com", name="O4", password="pass1234")
        Investment.objects.create(
            user=other,
            name="X",
            asset_type="outros",
            invested_amount=Decimal("9999"),
            current_amount=Decimal("9999"),
            purchase_date="2026-01-01",
        )
        r = auth_client.get(self.url)
        assert Decimal(r.data["data"]["total_invested"]) == Decimal("0")
