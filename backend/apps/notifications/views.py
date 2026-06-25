from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import success_response

from .models import Notification
from .repositories import NotificationRepository
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)
        return success_response(data=NotificationSerializer(notifications, many=True).data)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        repo = NotificationRepository()
        if pk:
            n = Notification.objects.filter(pk=pk, user=request.user).first()
            if not n:
                from core.responses import error_response
                return error_response(message="Notificação não encontrada.", status=404)
            n.is_read = True
            n.save(update_fields=["is_read"])
        else:
            repo.mark_all_read(request.user)
        return success_response(message="Marcado como lido.")
