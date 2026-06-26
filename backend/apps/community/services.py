from django.db.models import Q
from django.utils import timezone

from apps.notifications.models import Notification

from .models import CommunityNudge, Friendship


def get_accepted_friendships(user):
    return Friendship.objects.filter(
        Q(requester=user) | Q(receiver=user),
        status=Friendship.StatusChoices.ACCEPTED,
    ).select_related("requester", "requester__couple_group", "receiver", "receiver__couple_group")


def are_friends(user_a, user_b):
    return Friendship.objects.filter(
        Q(requester=user_a, receiver=user_b) | Q(requester=user_b, receiver=user_a),
        status=Friendship.StatusChoices.ACCEPTED,
    ).exists()


def deliver_pending_nudges():
    now = timezone.now()
    due = CommunityNudge.objects.filter(status=CommunityNudge.StatusChoices.SCHEDULED, deliver_at__lte=now)
    for nudge in due:
        Notification.objects.create(
            user=nudge.receiver,
            title=f"Incentivo de {nudge.sender.name}",
            message=nudge.message,
            type=Notification.TypeChoices.INFO,
        )
        nudge.status = CommunityNudge.StatusChoices.DELIVERED
        nudge.delivered_at = now
        nudge.save(update_fields=["status", "delivered_at", "updated_at"])
