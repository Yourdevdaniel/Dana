from django.contrib import admin

from .models import Salary, Wallet


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ["user", "name", "currency", "created_at"]


@admin.register(Salary)
class SalaryAdmin(admin.ModelAdmin):
    list_display = ["user", "amount", "effective_date"]
    list_filter = ["effective_date"]
