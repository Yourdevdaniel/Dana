import pytest

from apps.users.models import User


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(email="test@test.com", name="Test", password="pass1234")
        assert user.email == "test@test.com"
        assert user.check_password("pass1234")
        assert user.is_active
        assert not user.is_staff

    def test_create_superuser(self):
        user = User.objects.create_superuser(email="admin@test.com", name="Admin", password="pass1234")
        assert user.is_staff
        assert user.is_superuser

    def test_str(self):
        user = User.objects.create_user(email="str@test.com", name="Str", password="pass1234")
        assert str(user) == "str@test.com"

    def test_xp_starts_at_zero(self):
        user = User.objects.create_user(email="xp@test.com", name="XP", password="pass1234")
        assert user.total_xp == 0
