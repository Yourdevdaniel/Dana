from django.contrib import admin

from .models import Investment


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ["name", "asset_type", "user", "invested_amount", "current_amount", "purchase_date"]
    list_filter = ["asset_type"]
    search_fields = ["name", "institution"]
