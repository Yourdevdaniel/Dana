import pytest
from django.utils import timezone

from apps.community.models import CommunityNudge, Friendship
from apps.users.models import User


def make_user(email, name="User"):
    return User.objects.create_user(email=email, name=name, password="pass1234")


@pytest.mark.django_db
class TestFriendRequests:
    url = "/api/community/friend-requests/"

    def test_send_request(self, auth_client, user, db):
        other = make_user("b@t.com")
        r = auth_client.post(self.url, {"to_user_id": str(other.id)})
        assert r.status_code == 201
        assert Friendship.objects.filter(requester=user, receiver=other, status="pending").exists()

    def test_cannot_send_to_self(self, auth_client, user):
        r = auth_client.post(self.url, {"to_user_id": str(user.id)})
        assert r.status_code == 400

    def test_duplicate_pending_rejected(self, auth_client, user, db):
        other = make_user("c@t.com")
        auth_client.post(self.url, {"to_user_id": str(other.id)})
        r = auth_client.post(self.url, {"to_user_id": str(other.id)})
        assert r.status_code == 400

    def test_already_friends_rejected(self, auth_client, user, db):
        other = make_user("d@t.com")
        Friendship.objects.create(requester=user, receiver=other, status="accepted")
        r = auth_client.post(self.url, {"to_user_id": str(other.id)})
        assert r.status_code == 400

    def test_nonexistent_user_404(self, auth_client):
        import uuid
        r = auth_client.post(self.url, {"to_user_id": str(uuid.uuid4())})
        assert r.status_code == 404

    def test_list_pending_received(self, auth_client, user, db):
        sender = make_user("e@t.com")
        Friendship.objects.create(requester=sender, receiver=user, status="pending")
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) == 1

    def test_sent_requests_not_in_received_list(self, auth_client, user, db):
        other = make_user("f@t.com")
        Friendship.objects.create(requester=user, receiver=other, status="pending")
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 0


@pytest.mark.django_db
class TestFriendAcceptReject:
    def test_accept(self, auth_client, user, db):
        sender = make_user("g@t.com")
        fs = Friendship.objects.create(requester=sender, receiver=user, status="pending")
        r = auth_client.post(f"/api/community/friend-requests/{fs.id}/accept/")
        assert r.status_code == 200
        fs.refresh_from_db()
        assert fs.status == "accepted"

    def test_reject(self, auth_client, user, db):
        sender = make_user("h@t.com")
        fs = Friendship.objects.create(requester=sender, receiver=user, status="pending")
        r = auth_client.post(f"/api/community/friend-requests/{fs.id}/reject/")
        assert r.status_code == 200
        fs.refresh_from_db()
        assert fs.status == "rejected"

    def test_cannot_accept_own_sent_request(self, auth_client, user, db):
        other = make_user("i@t.com")
        fs = Friendship.objects.create(requester=user, receiver=other, status="pending")
        r = auth_client.post(f"/api/community/friend-requests/{fs.id}/accept/")
        assert r.status_code == 404

    def test_requires_auth(self, api_client, db):
        import uuid
        r = api_client.post(f"/api/community/friend-requests/{uuid.uuid4()}/accept/")
        assert r.status_code == 401


@pytest.mark.django_db
class TestFriendList:
    url = "/api/community/friends/"

    def test_list_accepted_friends(self, auth_client, user, db):
        other = make_user("j@t.com")
        Friendship.objects.create(requester=user, receiver=other, status="accepted")
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) == 1

    def test_pending_not_in_friends_list(self, auth_client, user, db):
        other = make_user("k@t.com")
        Friendship.objects.create(requester=user, receiver=other, status="pending")
        r = auth_client.get(self.url)
        assert len(r.data["data"]) == 0

    def test_friend_data_no_private_fields(self, auth_client, user, db):
        other = make_user("l@t.com")
        Friendship.objects.create(requester=user, receiver=other, status="accepted")
        r = auth_client.get(self.url)
        friend_data = r.data["data"][0]["friend"]
        assert "email" not in friend_data
        assert "date_of_birth" not in friend_data

    def test_delete_friendship(self, auth_client, user, db):
        other = make_user("m@t.com")
        fs = Friendship.objects.create(requester=user, receiver=other, status="accepted")
        r = auth_client.delete(f"/api/community/friends/{fs.id}/")
        assert r.status_code == 200
        assert not Friendship.objects.filter(pk=fs.id).exists()

    def test_delete_by_either_party(self, auth_client, user, db):
        other = make_user("n@t.com")
        fs = Friendship.objects.create(requester=other, receiver=user, status="accepted")
        r = auth_client.delete(f"/api/community/friends/{fs.id}/")
        assert r.status_code == 200


@pytest.mark.django_db
class TestNudges:
    url = "/api/community/nudges/"

    def _make_friends(self, user):
        other = make_user("o@t.com", "Friend")
        Friendship.objects.create(requester=user, receiver=other, status="accepted")
        return other

    def test_send_nudge_to_friend(self, auth_client, user, db):
        other = self._make_friends(user)
        r = auth_client.post(self.url, {
            "to_user_id": str(other.id),
            "message": "Parabéns pelo progresso!",
            "deliver_at": timezone.now().isoformat(),
        })
        assert r.status_code == 201

    def test_cannot_nudge_non_friend(self, auth_client, user, db):
        other = make_user("p@t.com")
        r = auth_client.post(self.url, {
            "to_user_id": str(other.id),
            "message": "Parabéns pelo progresso!",
            "deliver_at": timezone.now().isoformat(),
        })
        assert r.status_code == 403

    def test_invalid_message_rejected(self, auth_client, user, db):
        other = self._make_friends(user)
        r = auth_client.post(self.url, {
            "to_user_id": str(other.id),
            "message": "mensagem qualquer",
            "deliver_at": timezone.now().isoformat(),
        })
        assert r.status_code == 400

    def test_past_deliver_at_rejected(self, auth_client, user, db):
        other = self._make_friends(user)
        past = (timezone.now() - timezone.timedelta(hours=2)).isoformat()
        r = auth_client.post(self.url, {
            "to_user_id": str(other.id),
            "message": "Parabéns pelo progresso!",
            "deliver_at": past,
        })
        assert r.status_code == 400

    def test_due_nudge_delivered_on_list(self, auth_client, user, db):
        from apps.notifications.models import Notification
        other = self._make_friends(user)
        CommunityNudge.objects.create(
            sender=user,
            receiver=other,
            message="Mande ver, falta pouco!",
            deliver_at=timezone.now() - timezone.timedelta(minutes=1),
            status="scheduled",
        )
        auth_client.get(self.url)
        assert Notification.objects.filter(user=other).exists()
        assert CommunityNudge.objects.filter(status="delivered").exists()

    def test_list_nudges(self, auth_client, user, db):
        other = self._make_friends(user)
        CommunityNudge.objects.create(
            sender=user,
            receiver=other,
            message="Continue, você está indo muito bem!",
            deliver_at=timezone.now() + timezone.timedelta(hours=1),
        )
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert len(r.data["data"]) >= 1

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401


@pytest.mark.django_db
class TestPrivacyView:
    url = "/api/users/me/privacy/"

    def test_get_defaults(self, auth_client):
        r = auth_client.get(self.url)
        assert r.status_code == 200
        assert r.data["data"]["show_group_on_profile"] is True
        assert r.data["data"]["show_membership_on_other_profiles"] is True

    def test_patch_privacy(self, auth_client, user):
        r = auth_client.patch(self.url, {"show_group_on_profile": False})
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.show_group_on_profile is False

    def test_patch_partial(self, auth_client, user):
        r = auth_client.patch(self.url, {"show_membership_on_other_profiles": False})
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.show_membership_on_other_profiles is False
        assert user.show_group_on_profile is True

    def test_requires_auth(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == 401


@pytest.mark.django_db
class TestPublicProfilePrivacy:
    def test_public_group_hidden_when_disabled(self, auth_client, user, db):
        from apps.couples.models import CoupleGroup
        group = CoupleGroup.objects.create(name="Casal")
        other = make_user("q@t.com")
        other.couple_group = group
        other.show_group_on_profile = False
        other.save()
        r = auth_client.get(f"/api/users/profiles/{other.id}/")
        assert r.data["data"]["public_group"] is None

    def test_public_group_shown_when_enabled(self, auth_client, user, db):
        from apps.couples.models import CoupleGroup
        group = CoupleGroup.objects.create(name="Casal Visível")
        other = make_user("r@t.com")
        other.couple_group = group
        other.show_group_on_profile = True
        other.save()
        r = auth_client.get(f"/api/users/profiles/{other.id}/")
        assert r.data["data"]["public_group"] is not None
        assert r.data["data"]["public_group"]["name"] == "Casal Visível"

    def test_profile_has_privacy_flags(self, auth_client, db):
        other = make_user("s@t.com")
        r = auth_client.get(f"/api/users/profiles/{other.id}/")
        data = r.data["data"]
        assert "show_group_on_profile" in data
        assert "show_membership_on_other_profiles" in data
