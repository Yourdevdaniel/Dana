from django.contrib import admin

from .models import FixedExpense


@admin.register(FixedExpense)
class FixedExpenseAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "amount", "due_day", "is_paid_this_month"]
    list_filter = ["is_paid_this_month"]
    search_fields = ["name", "user__email"]
