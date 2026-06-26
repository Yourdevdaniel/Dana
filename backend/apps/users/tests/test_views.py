import pytest
from apps.users.models import User


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="other@test.com", name="Other Person", password="pass1234")


@pytest.mark.django_db
class TestProfileListView:
    url = "/api/users/profiles/"

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401

    def test_lists_active_users(self, auth_client, user, other_user):
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert r.data["success"] is True
        ids = [p["id"] for p in r.data["data"]]
        assert str(user.id) in ids
        assert str(other_user.id) in ids

    def test_returns_empty_list_when_no_match(self, auth_client):
        r = auth_client.get(self.url, {"search": "zzznomatch999"})
        assert r.status_code == 200
        assert r.data["data"] == []

    def test_search_by_name(self, auth_client, other_user):
        r = auth_client.get(self.url, {"search": "Other"})
        assert r.status_code == 200
        names = [p["name"] for p in r.data["data"]]
        assert "Other Person" in names

    def test_search_by_email(self, auth_client, other_user):
        r = auth_client.get(self.url, {"search": "other@test"})
        assert r.status_code == 200
        assert len(r.data["data"]) == 1
        assert r.data["data"][0]["name"] == "Other Person"

    def test_no_sensitive_fields(self, auth_client, other_user):
        r = auth_client.get(self.url)
        for profile in r.data["data"]:
            assert "email" not in profile
            assert "date_of_birth" not in profile
            assert "password" not in profile

    def test_public_fields_present(self, auth_client, other_user):
        r = auth_client.get(self.url)
        profile = next(p for p in r.data["data"] if str(other_user.id) == p["id"])
        assert "id" in profile
        assert "name" in profile
        assert "avatar" in profile
        assert "total_xp" in profile
        assert "created_at" in profile

    def test_inactive_users_excluded(self, auth_client, other_user):
        other_user.is_active = False
        other_user.save()
        r = auth_client.get(self.url, {"search": "Other"})
        assert r.data["data"] == []


@pytest.mark.django_db
class TestProfileDetailView:
    def _url(self, pk):
        return f"/api/users/profiles/{pk}/"

    def test_requires_auth(self, api_client, other_user):
        r = api_client.get(self._url(other_user.id))
        assert r.status_code == 401

    def test_retrieve_public_profile(self, auth_client, other_user):
        r = auth_client.get(self._url(other_user.id))
        assert r.status_code == 200
        assert r.data["data"]["name"] == "Other Person"

    def test_public_fields_present(self, auth_client, other_user):
        r = auth_client.get(self._url(other_user.id))
        data = r.data["data"]
        for field in (
            "id", "name", "avatar", "total_xp", "created_at",
            "featured_badges", "show_group_on_profile",
            "show_membership_on_other_profiles", "public_group",
        ):
            assert field in data

    def test_featured_badges_is_list(self, auth_client, other_user):
        r = auth_client.get(self._url(other_user.id))
        assert isinstance(r.data["data"]["featured_badges"], list)

    def test_no_sensitive_fields_in_detail(self, auth_client, other_user):
        r = auth_client.get(self._url(other_user.id))
        data = r.data["data"]
        for forbidden in ("email", "date_of_birth", "password", "is_staff", "is_active"):
            assert forbidden not in data

    def test_not_found_returns_404(self, auth_client):
        import uuid
        r = auth_client.get(self._url(uuid.uuid4()))
        assert r.status_code == 404
        assert r.data["success"] is False

    def test_inactive_user_not_found(self, auth_client, other_user):
        other_user.is_active = False
        other_user.save()
        r = auth_client.get(self._url(other_user.id))
        assert r.status_code == 404


@pytest.mark.django_db
class TestDeleteMe:
    url = "/api/users/me/"

    def test_delete_deactivates_account(self, auth_client, user):
        r = auth_client.delete(self.url)
        assert r.status_code == 200
        assert r.data["success"] is True
        user.refresh_from_db()
        assert user.is_active is False

    def test_deleted_user_cannot_login(self, auth_client, user, api_client):
        auth_client.delete(self.url)
        r = api_client.post("/api/auth/login/", {"email": "user@test.com", "password": "pass1234"})
        assert r.status_code in (400, 401)

    def test_requires_auth(self, api_client):
        r = api_client.delete(self.url)
        assert r.status_code == 401
