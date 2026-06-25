from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import success_response

from .serializers import DashboardSerializer
from .services import FinancialEngine


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        engine = FinancialEngine(request.user)
        data = engine.summary()
        serializer = DashboardSerializer(data)
        return success_response(data=serializer.data)


class CoupleDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.couple_group:
            return success_response(data=None, message="Sem grupo de casal.")

        members = request.user.couple_group.members.all()
        result = []
        for member in members:
            engine = FinancialEngine(member)
            result.append({"user_id": str(member.id), "name": member.name, **engine.summary()})
        return success_response(data=result)
