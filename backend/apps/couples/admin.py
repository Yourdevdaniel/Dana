from django.contrib import admin

from .models import CoupleGroup


@admin.register(CoupleGroup)
class CoupleGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "invite_code", "created_at"]
    search_fields = ["name", "invite_code"]
