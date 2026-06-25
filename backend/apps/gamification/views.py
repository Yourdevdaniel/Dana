from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import success_response

from .models import UserBadge, XPHistory
from .serializers import RankingSerializer, UserBadgeSerializer, XPHistorySerializer
from .services import RankingService


class XPHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = XPHistory.objects.filter(user=request.user)[:20]
        return success_response(data=XPHistorySerializer(history, many=True).data)


class BadgesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        badges = UserBadge.objects.filter(user=request.user).select_related("badge")
        return success_response(data=UserBadgeSerializer(badges, many=True).data)


class RankingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get("period", "general")
        couple_group = request.user.couple_group if request.query_params.get("couple") else None
        svc = RankingService()
        ranking = svc.get_ranking(period=period, couple_group=couple_group)
        return success_response(data=RankingSerializer(ranking, many=True).data)
