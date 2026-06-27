from django.contrib import admin

from .models import CreditCard


@admin.register(CreditCard)
class CreditCardAdmin(admin.ModelAdmin):
    list_display = ["nickname", "user", "credit_limit", "current_debt", "closing_day", "due_day"]
    search_fields = ["nickname", "user__email"]
