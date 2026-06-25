import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    u = User.objects.create_user(email="user@test.com", name="Test User", password="pass1234")
    u.is_email_verified = True
    u.save(update_fields=["is_email_verified"])
    return u


@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return api_client
