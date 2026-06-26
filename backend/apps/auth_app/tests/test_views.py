import pytest

STRONG_PASSWORD = "Teste@123"


@pytest.mark.django_db
class TestRegisterView:
    url = "/api/auth/register/"

    def test_register_success(self, api_client):
        r = api_client.post(self.url, {"email": "new@test.com", "name": "New", "password": STRONG_PASSWORD})
        assert r.status_code == 201
        assert r.data["success"] is True
        assert "access" in r.data["data"]
        assert "refresh" in r.data["data"]

    def test_register_duplicate_email(self, api_client, user):
        r = api_client.post(self.url, {"email": user.email, "name": "Dup", "password": STRONG_PASSWORD})
        assert r.status_code == 400
        assert r.data["success"] is False

    def test_register_missing_fields(self, api_client):
        r = api_client.post(self.url, {"email": "x@x.com"})
        assert r.status_code == 400

    def test_register_short_password(self, api_client):
        r = api_client.post(self.url, {"email": "x@x.com", "name": "X", "password": "123"})
        assert r.status_code == 400

    def test_register_weak_password_no_uppercase(self, api_client):
        r = api_client.post(self.url, {"email": "x@x.com", "name": "X", "password": "teste@123"})
        assert r.status_code == 400

    def test_register_weak_password_no_special(self, api_client):
        r = api_client.post(self.url, {"email": "x@x.com", "name": "X", "password": "Teste1234"})
        assert r.status_code == 400

    def test_register_weak_password_no_number(self, api_client):
        r = api_client.post(self.url, {"email": "x@x.com", "name": "X", "password": "Teste@abc"})
        assert r.status_code == 400

    def test_password_not_in_response(self, api_client):
        r = api_client.post(self.url, {"email": "safe@test.com", "name": "S", "password": STRONG_PASSWORD})
        assert "password" not in str(r.data["data"].get("user", {}))


@pytest.mark.django_db
class TestLoginView:
    url = "/api/auth/login/"

    def test_login_success(self, api_client, user):
        r = api_client.post(self.url, {"email": user.email, "password": "pass1234"})
        assert r.status_code == 200
        assert r.data["success"] is True
        assert "access" in r.data["data"]

    def test_login_wrong_password(self, api_client, user):
        r = api_client.post(self.url, {"email": user.email, "password": "wrongpass"})
        assert r.status_code == 400
        assert r.data["success"] is False

    def test_login_unknown_email(self, api_client):
        r = api_client.post(self.url, {"email": "ghost@test.com", "password": "pass1234"})
        assert r.status_code == 400

    def test_login_inactive_user(self, api_client, user):
        user.is_active = False
        user.save()
        r = api_client.post(self.url, {"email": user.email, "password": "pass1234"})
        assert r.status_code == 400

    def test_login_lockout_after_five_failures(self, api_client, db):
        from apps.users.models import User
        victim = User.objects.create_user(email="locktest@test.com", name="Lock", password="LockPass@1")
        for _ in range(5):
            api_client.post(self.url, {"email": victim.email, "password": "wrongpass"})
        r = api_client.post(self.url, {"email": victim.email, "password": "LockPass@1"})
        assert r.status_code == 400
        assert "bloqueada" in r.data["errors"][0]["message"].lower()

    def test_login_error_message_is_generic(self, api_client):
        r = api_client.post(self.url, {"email": "generic@test.com", "password": "wrongpass"})
        msg = r.data["errors"][0]["message"].lower()
        assert "credenciais" in msg
        assert "generic@test.com" not in msg


@pytest.mark.django_db
class TestLogoutView:
    url = "/api/auth/logout/"

    def _get_tokens(self, api_client, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token), str(refresh)

    def test_logout_success(self, api_client, user):
        access, refresh = self._get_tokens(api_client, user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        r = api_client.post(self.url, {"refresh": refresh})
        assert r.status_code == 200

    def test_logout_requires_auth(self, api_client):
        r = api_client.post(self.url, {"refresh": "anything"})
        assert r.status_code == 401

    def test_logout_missing_refresh(self, auth_client):
        r = auth_client.post(self.url, {})
        assert r.status_code == 400

    def test_logout_invalid_token(self, auth_client):
        r = auth_client.post(self.url, {"refresh": "bad-token"})
        assert r.status_code == 400


@pytest.mark.django_db
class TestGoogleLoginView:
    url = "/api/auth/google/"

    def test_creates_user_on_first_google_login(self, api_client, mocker):
        mocker.patch(
            "apps.auth_app.views._verify_google_token",
            return_value={"email": "google@test.com", "name": "Google User"},
        )
        r = api_client.post(self.url, {"id_token": "fake-token"})
        assert r.status_code == 200
        assert "access" in r.data["data"]

    def test_links_existing_account_by_email(self, api_client, mocker, user):
        mocker.patch(
            "apps.auth_app.views._verify_google_token",
            return_value={"email": user.email, "name": user.name},
        )
        r = api_client.post(self.url, {"id_token": "fake-token"})
        assert r.status_code == 200
        assert r.data["data"]["user"]["email"] == user.email

    def test_invalid_google_token_rejected(self, api_client, mocker):
        mocker.patch(
            "apps.auth_app.views._verify_google_token",
            side_effect=Exception("invalid"),
        )
        r = api_client.post(self.url, {"id_token": "bad"})
        assert r.status_code == 400

    def test_missing_id_token(self, api_client):
        r = api_client.post(self.url, {})
        assert r.status_code == 400
