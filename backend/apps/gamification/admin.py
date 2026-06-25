from django.contrib import admin

from .models import Badge, UserBadge, XPHistory


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ["name", "condition_type", "condition_value", "xp_reward"]


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ["user", "badge", "awarded_at"]


@admin.register(XPHistory)
class XPHistoryAdmin(admin.ModelAdmin):
    list_display = ["user", "amount", "reason", "created_at"]
    list_filter = ["reason"]
