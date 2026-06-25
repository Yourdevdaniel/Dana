from django.contrib import admin

from .models import Debt


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = ["creditor", "user", "amount", "paid_amount", "status", "due_date"]
    list_filter = ["status"]
    search_fields = ["creditor", "user__email"]
