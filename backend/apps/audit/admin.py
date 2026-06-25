from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "model_name", "path", "user", "ip_address", "created_at"]
    list_filter = ["action"]
    search_fields = ["path", "user__email"]
    readonly_fields = ["id", "user", "action", "model_name", "object_id", "path", "data", "ip_address", "created_at"]
