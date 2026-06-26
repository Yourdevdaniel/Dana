from django.contrib import admin

from .models import CommunityNudge, Friendship


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ["requester", "receiver", "status", "created_at"]
    list_filter = ["status"]


@admin.register(CommunityNudge)
class CommunityNudgeAdmin(admin.ModelAdmin):
    list_display = ["sender", "receiver", "status", "deliver_at", "delivered_at"]
    list_filter = ["status"]
