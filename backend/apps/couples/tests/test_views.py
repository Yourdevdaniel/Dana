import pytest
from apps.couples.models import CoupleGroup


@pytest.mark.django_db
class TestCoupleGroupView:
    url = "/api/couples/"

    def test_get_no_group(self, auth_client):
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert r.data["message"] == "Sem grupo de casal."

    def test_create_group(self, auth_client, user):
        r = auth_client.post(self.url, {"name": "Nosso Casal"})
        assert r.status_code == 201
        user.refresh_from_db()
        assert user.couple_group is not None

    def test_create_group_twice_fails(self, auth_client, user):
        auth_client.post(self.url, {"name": "Primeiro"})
        r = auth_client.post(self.url, {"name": "Segundo"})
        assert r.status_code == 400

    def test_get_group_after_create(self, auth_client, user):
        auth_client.post(self.url, {"name": "Nosso"})
        r = auth_client.get(self.url)
        assert r.data["data"]["name"] == "Nosso"
        assert "invite_code" in r.data["data"]

    def test_leave_group(self, auth_client, user):
        auth_client.post(self.url, {"name": "Casal"})
        r = auth_client.delete(self.url)
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.couple_group is None


@pytest.mark.django_db
class TestJoinCoupleView:
    url = "/api/couples/join/"

    def test_join_with_valid_code(self, auth_client, user, db):
        from apps.users.models import User
        other = User.objects.create_user(email="leader@t.com", name="Leader", password="pass1234")
        group = CoupleGroup.objects.create(name="Casal Teste")
        other.couple_group = group
        other.save()

        r = auth_client.post(self.url, {"invite_code": group.invite_code})
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.couple_group == group

    def test_join_invalid_code(self, auth_client):
        r = auth_client.post(self.url, {"invite_code": "INVALIDO"})
        assert r.status_code == 400

    def test_join_full_group_fails(self, auth_client, user, db):
        from apps.users.models import User
        m1 = User.objects.create_user(email="m1@t.com", name="M1", password="pass1234")
        m2 = User.objects.create_user(email="m2@t.com", name="M2", password="pass1234")
        group = CoupleGroup.objects.create(name="Full")
        m1.couple_group = group
        m1.save()
        m2.couple_group = group
        m2.save()
        r = auth_client.post(self.url, {"invite_code": group.invite_code})
        assert r.status_code == 400
