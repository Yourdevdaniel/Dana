import pytest
from apps.users.models import User


@pytest.mark.django_db
class TestRankingView:
    url = "/api/gamification/ranking/"

    def test_ranking_returns_top_10(self, auth_client, db):
        for i in range(12):
            u = User.objects.create_user(
                email=f"rank{i}@t.com", name=f"User {i}", password="pass1234"
            )
            u.total_xp = (12 - i) * 100
            u.save()
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) == 10

    def test_ranking_ordered_by_xp_desc(self, auth_client, db):
        u1 = User.objects.create_user(email="r1@t.com", name="R1", password="pass1234")
        u2 = User.objects.create_user(email="r2@t.com", name="R2", password="pass1234")
        u1.total_xp = 100
        u1.save()
        u2.total_xp = 500
        u2.save()
        r = auth_client.get(self.url)
        xp_values = [entry["total_xp"] for entry in r.data["data"]]
        assert xp_values == sorted(xp_values, reverse=True)

    def test_ranking_has_rank_field(self, auth_client, user):
        r = auth_client.get(self.url)
        assert r.status_code == 200
        for entry in r.data["data"]:
            assert "rank" in entry
            assert "total_xp" in entry
            assert "user" in entry

    def test_ranking_no_email_or_dob(self, auth_client, user):
        r = auth_client.get(self.url)
        for entry in r.data["data"]:
            assert "email" not in entry["user"]
            assert "date_of_birth" not in entry["user"]

    def test_ranking_user_fields(self, auth_client, user):
        r = auth_client.get(self.url)
        for entry in r.data["data"]:
            assert "id" in entry["user"]
            assert "name" in entry["user"]
            assert "avatar" in entry["user"]

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401
