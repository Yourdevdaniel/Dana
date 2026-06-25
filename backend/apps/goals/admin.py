from django.contrib import admin

from .models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "target_amount", "current_amount", "status", "deadline"]
    list_filter = ["status"]
    search_fields = ["name", "user__email"]
