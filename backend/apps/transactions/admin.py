from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["user", "type", "amount", "category", "date"]
    list_filter = ["type", "date"]
    search_fields = ["description", "user__email"]
