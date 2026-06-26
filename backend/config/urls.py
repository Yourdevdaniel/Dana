from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def api_root(_request):
    return JsonResponse(
        {
            "success": True,
            "data": {
                "name": "Finance Couple API",
                "docs": "/api/docs/",
                "schema": "/api/schema/",
            },
            "message": "",
            "errors": [],
        }
    )

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api", api_root),
    path("api/", api_root),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/", include("apps.auth_app.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/couples/", include("apps.couples.urls")),
    path("api/wallet/", include("apps.wallet.urls")),
    path("api/transactions/", include("apps.transactions.urls")),
    path("api/categories/", include("apps.categories.urls")),
    path("api/goals/", include("apps.goals.urls")),
    path("api/debts/", include("apps.debts.urls")),
    path("api/fixed-expenses/", include("apps.fixed_expenses.urls")),
    path("api/gamification/", include("apps.gamification.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/investments/", include("apps.investments.urls")),
]
