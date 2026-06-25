import pytest
from apps.categories.models import Category


@pytest.mark.django_db
class TestCategoryViews:
    url = "/api/categories/"

    def test_list_includes_system_categories(self, auth_client):
        Category.objects.create(name="Sistema", type="expense", is_system=True)
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) >= 1

    def test_list_includes_own_categories(self, auth_client, user):
        Category.objects.create(user=user, name="Minha", type="expense")
        r = auth_client.get(self.url)
        names = [c["name"] for c in r.data["data"]]
        assert "Minha" in names

    def test_other_users_category_not_listed(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o@c.com", name="O", password="pass1234")
        Category.objects.create(user=other, name="Deles", type="expense")
        r = auth_client.get(self.url)
        names = [c["name"] for c in r.data["data"]]
        assert "Deles" not in names

    def test_create_category(self, auth_client):
        r = auth_client.post(self.url, {"name": "Nova", "type": "expense", "color": "#000000"})
        assert r.status_code == 201

    def test_cannot_delete_other_users_category(self, auth_client, db):
        from apps.users.models import User
        other = User.objects.create_user(email="o2@c.com", name="O2", password="pass1234")
        cat = Category.objects.create(user=other, name="Deles", type="expense")
        r = auth_client.delete(f"/api/categories/{cat.id}/")
        assert r.status_code in (403, 404)

    def test_soft_delete(self, auth_client, user):
        cat = Category.objects.create(user=user, name="Para Deletar", type="expense")
        r = auth_client.delete(f"/api/categories/{cat.id}/")
        assert r.status_code == 200
        cat.refresh_from_db()
        assert cat.is_deleted is True
