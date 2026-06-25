import pytest
from django.utils import timezone
from datetime import timedelta

STRONG_PASSWORD = "Teste@123"


@pytest.mark.django_db
class TestRegisterView:
    url = "/api/auth/register/"

    def test_register_success(self, api_client, mocker):
        mocker.patch("apps.auth_app.views._send_verification_email")
        r = api_client.post(self.url, {"email": "new@test.com", "name": "New", "password": STRONG_PASSWORD})
        assert r.status_code == 201
        assert r.data["success"] is True
        assert "access" in r.data["data"]
        assert "refresh" in r.data["data"]

    def test_register_sends_verification_email(self, api_client, mocker):
        mock_send = mocker.patch("apps.auth_app.views._send_verification_email")
        api_client.post(self.url, {"email": "new2@test.com", "name": "New2", "password": STRONG_PASSWORD})
        assert mock_send.called

    def test_register_user_not_verified_initially(self, api_client, mocker):
        mocker.patch("apps.auth_app.views._send_verification_email")
        r = api_client.post(self.url, {"email": "unv@test.com", "name": "Unv", "password": STRONG_PASSWORD})
        assert r.data["data"]["user"]["is_email_verified"] is False

    def test_register_duplicate_email(self, api_client, user, mocker):
        mocker.patch("apps.auth_app.views._send_verification_email")
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

    def test_password_not_in_response(self, api_client, mocker):
        mocker.patch("apps.auth_app.views._send_verification_email")
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

    def test_login_unverified_user_blocked(self, api_client, db):
        from apps.users.models import User
        unverified = User.objects.create_user(email="unv@test.com", name="U", password="pass1234")
        r = api_client.post(self.url, {"email": unverified.email, "password": "pass1234"})
        assert r.status_code == 400
        assert "email" in r.data["errors"][0]["message"].lower() or "verif" in r.data["errors"][0]["message"].lower()

    def test_login_lockout_after_five_failures(self, api_client, db):
        from apps.users.models import User
        victim = User.objects.create_user(email="locktest@test.com", name="Lock", password="LockPass@1")
        victim.is_email_verified = True
        victim.save(update_fields=["is_email_verified"])
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
class TestVerifyEmailView:
    def _url(self, token):
        return f"/api/auth/verify-email/{token}/"

    def test_valid_token_verifies_user(self, api_client, db):
        from apps.users.models import User
        user = User.objects.create_user(email="verify@test.com", name="V", password="pass")
        token = user.generate_verification_token()
        r = api_client.get(self._url(token))
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.is_email_verified is True
        # token mantido para idempotência: segunda chamada retorna sucesso em vez de erro
        assert user.email_verification_token is not None
        # segunda chamada com o mesmo token deve retornar sucesso (React StrictMode safe)
        r2 = api_client.get(self._url(token))
        assert r2.status_code == 200

    def test_expired_token_rejected(self, api_client, db):
        from apps.users.models import User
        user = User.objects.create_user(email="exp@test.com", name="E", password="pass")
        user.generate_verification_token()
        user.email_verification_expires = timezone.now() - timedelta(hours=1)
        user.save(update_fields=["email_verification_expires"])
        r = api_client.get(self._url(user.email_verification_token))
        assert r.status_code == 400
        assert "expirado" in r.data["message"].lower()

    def test_invalid_token_rejected(self, api_client):
        r = api_client.get(self._url("invalid-token-xyz"))
        assert r.status_code == 400

    def test_already_verified_returns_ok(self, api_client, db):
        from apps.users.models import User
        user = User.objects.create_user(email="alr@test.com", name="A", password="pass")
        token = user.generate_verification_token()
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        r = api_client.get(self._url(token))
        assert r.status_code == 200


@pytest.mark.django_db
class TestResendVerificationView:
    url = "/api/auth/resend-verification/"

    def test_resend_sends_email(self, api_client, mocker, db):
        from apps.users.models import User
        mock_send = mocker.patch("apps.auth_app.views._send_verification_email")
        user = User.objects.create_user(email="res@test.com", name="R", password="pass")
        r = api_client.post(self.url, {"email": user.email})
        assert r.status_code == 200
        assert mock_send.called

    def test_unknown_email_still_returns_200(self, api_client):
        r = api_client.post(self.url, {"email": "nobody@test.com"})
        assert r.status_code == 200

    def test_already_verified_silent(self, api_client, mocker, user):
        mock_send = mocker.patch("apps.auth_app.views._send_verification_email")
        r = api_client.post(self.url, {"email": user.email})
        assert r.status_code == 200
        assert not mock_send.called


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

    def test_google_user_is_auto_verified(self, api_client, mocker):
        mocker.patch(
            "apps.auth_app.views._verify_google_token",
            return_value={"email": "gv@test.com", "name": "GV"},
        )
        api_client.post(self.url, {"id_token": "fake"})
        from apps.users.models import User
        u = User.objects.get(email="gv@test.com")
        assert u.is_email_verified is True
