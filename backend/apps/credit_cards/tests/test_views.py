import pytest
from decimal import Decimal

from apps.credit_cards.models import CreditCard


def make_card(user, nickname="Nubank", **kwargs):
    defaults = {
        "credit_limit": Decimal("5000"),
        "current_debt": Decimal("0"),
        "closing_day": 10,
        "due_day": 17,
    }
    defaults.update(kwargs)
    return CreditCard.objects.create(user=user, nickname=nickname, **defaults)


@pytest.mark.django_db
class TestCreditCardListCreate:
    url = "/api/credit-cards/"

    def test_create_card(self, auth_client):
        r = auth_client.post(self.url, {
            "nickname": "Nubank",
            "credit_limit": "5000.00",
            "current_debt": "200.00",
            "closing_day": 10,
            "due_day": 17,
        })
        assert r.status_code == 201
        assert r.data["data"]["nickname"] == "Nubank"

    def test_create_with_optional_interest(self, auth_client):
        r = auth_client.post(self.url, {
            "nickname": "C6",
            "credit_limit": "3000.00",
            "closing_day": 5,
            "due_day": 12,
            "monthly_interest": "3.99",
        })
        assert r.status_code == 201
        assert r.data["data"]["monthly_interest"] == "3.99"

    def test_create_without_interest(self, auth_client):
        r = auth_client.post(self.url, {
            "nickname": "Inter",
            "credit_limit": "2000.00",
            "closing_day": 1,
            "due_day": 8,
        })
        assert r.status_code == 201
        assert r.data["data"]["monthly_interest"] is None

    def test_list_own_cards(self, auth_client, user):
        make_card(user, "Bradesco")
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) == 1

    def test_other_users_cards_not_visible(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o@cc.com", name="O", password="pass1234")
        make_card(other, "Ouro")
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 0

    def test_no_sensitive_fields_accepted(self, auth_client):
        r = auth_client.post(self.url, {
            "nickname": "Visa",
            "credit_limit": "1000.00",
            "closing_day": 15,
            "due_day": 22,
            "card_number": "4111111111111111",
            "cvv": "123",
        })
        assert r.status_code == 201
        data = r.data["data"]
        assert "card_number" not in data
        assert "cvv" not in data

    def test_zero_limit_rejected(self, auth_client):
        r = auth_client.post(self.url, {
            "nickname": "X",
            "credit_limit": "0",
            "closing_day": 1,
            "due_day": 8,
        })
        assert r.status_code == 400

    def test_negative_debt_rejected(self, auth_client):
        r = auth_client.post(self.url, {
            "nickname": "X",
            "credit_limit": "1000.00",
            "current_debt": "-100",
            "closing_day": 1,
            "due_day": 8,
        })
        assert r.status_code == 400

    def test_invalid_closing_day_rejected(self, auth_client):
        r = auth_client.post(self.url, {
            "nickname": "X",
            "credit_limit": "1000.00",
            "closing_day": 0,
            "due_day": 8,
        })
        assert r.status_code == 400

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401


@pytest.mark.django_db
class TestCreditCardDetail:
    def _url(self, pk):
        return f"/api/credit-cards/{pk}/"

    def test_delete_own_card(self, auth_client, user):
        card = make_card(user)
        r = auth_client.delete(self._url(card.id))
        assert r.status_code == 200
        assert not CreditCard.objects.filter(pk=card.id).exists()

    def test_cannot_delete_other_users_card(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o2@cc.com", name="O2", password="pass1234")
        card = make_card(other, "Protegido")
        r = auth_client.delete(self._url(card.id))
        assert r.status_code in (403, 404)

    def test_patch_card(self, auth_client, user):
        card = make_card(user)
        r = auth_client.patch(self._url(card.id), {"current_debt": "1500.00"})
        assert r.status_code == 200
        card.refresh_from_db()
        assert card.current_debt == Decimal("1500.00")

    def test_cannot_patch_other_users_card(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o3@cc.com", name="O3", password="pass1234")
        card = make_card(other)
        r = auth_client.patch(self._url(card.id), {"current_debt": "999"})
        assert r.status_code in (403, 404)

    def test_response_envelope(self, auth_client, user):
        card = make_card(user)
        r = auth_client.delete(self._url(card.id))
        assert r.data["success"] is True
        assert "data" in r.data
