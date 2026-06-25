import pytest
from decimal import Decimal

from apps.transactions.models import Transaction
from apps.wallet.models import Wallet
from apps.categories.models import Category


@pytest.fixture
def wallet(user):
    return Wallet.objects.create(user=user)


@pytest.fixture
def category(user):
    return Category.objects.create(user=user, name="Test Cat", type="expense")


@pytest.fixture
def system_category():
    return Category.objects.create(name="Sistema", type="expense", is_system=True)


@pytest.mark.django_db
class TestTransactionListCreate:
    url = "/api/transactions/"

    def test_create_transaction(self, auth_client, wallet, category):
        r = auth_client.post(self.url, {
            "amount": "100.00", "type": "expense", "date": "2026-01-01",
            "wallet": str(wallet.id), "category": str(category.id),
        })
        assert r.status_code == 201
        assert r.data["success"] is True

    def test_list_only_own_transactions(self, auth_client, user, wallet):
        from apps.users.models import User
        other = User.objects.create_user(email="o@o.com", name="O", password="pass1234")
        other_wallet = Wallet.objects.create(user=other)
        Transaction.objects.create(user=other, wallet=other_wallet, amount=Decimal("500"), type="income", date="2026-01-01")
        Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("100"), type="expense", date="2026-01-01")
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 1

    def test_idor_wallet_rejected(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="idor@t.com", name="Idor", password="pass1234")
        other_wallet = Wallet.objects.create(user=other)
        r = auth_client.post(self.url, {
            "amount": "100.00", "type": "expense", "date": "2026-01-01",
            "wallet": str(other_wallet.id),
        })
        assert r.status_code == 400
        assert r.data["success"] is False

    def test_idor_category_rejected(self, auth_client, wallet, db):
        from apps.users.models import User
        other = User.objects.create_user(email="idor2@t.com", name="Idor2", password="pass1234")
        other_cat = Category.objects.create(user=other, name="Private", type="expense")
        r = auth_client.post(self.url, {
            "amount": "50.00", "type": "expense", "date": "2026-01-01",
            "wallet": str(wallet.id), "category": str(other_cat.id),
        })
        assert r.status_code == 400

    def test_system_category_allowed(self, auth_client, wallet, system_category):
        r = auth_client.post(self.url, {
            "amount": "50.00", "type": "expense", "date": "2026-01-01",
            "wallet": str(wallet.id), "category": str(system_category.id),
        })
        assert r.status_code == 201

    def test_negative_amount_rejected(self, auth_client, wallet):
        r = auth_client.post(self.url, {
            "amount": "-50.00", "type": "expense", "date": "2026-01-01",
            "wallet": str(wallet.id),
        })
        assert r.status_code == 400

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401


@pytest.mark.django_db
class TestTransactionDetail:
    def _url(self, pk):
        return f"/api/transactions/{pk}/"

    def test_retrieve(self, auth_client, user, wallet):
        tx = Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("100"), type="income", date="2026-01-01")
        r = auth_client.get(self._url(tx.id))
        assert r.status_code == 200

    def test_cannot_access_other_users_transaction(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o2@o.com", name="O2", password="pass1234")
        other_wallet = Wallet.objects.create(user=other)
        tx = Transaction.objects.create(user=other, wallet=other_wallet, amount=Decimal("500"), type="income", date="2026-01-01")
        r = auth_client.get(self._url(tx.id))
        assert r.status_code == 404

    def test_soft_delete(self, auth_client, user, wallet):
        tx = Transaction.objects.create(user=user, wallet=wallet, amount=Decimal("100"), type="income", date="2026-01-01")
        r = auth_client.delete(self._url(tx.id))
        assert r.status_code == 200
        assert Transaction.all_objects.filter(pk=tx.id, is_deleted=True).exists()
