from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Q

from core.responses import success_response

from .models import User
from .serializers import UserSerializer, UserUpdateSerializer, PublicProfileSerializer
from .services import UserService


class ProfileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        qs = User.objects.filter(is_active=True)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search))
        serializer = PublicProfileSerializer(qs, many=True, context={"request": request})
        return success_response(data=serializer.data)


class ProfileDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_active=True)
        except User.DoesNotExist:
            from core.responses import error_response
            return error_response(message="Perfil não encontrado.", status=404)
        serializer = PublicProfileSerializer(user, context={"request": request})
        return success_response(data=serializer.data)


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(data=serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        svc = UserService()
        svc.update_profile(request.user, serializer.validated_data)
        return success_response(data=UserSerializer(request.user).data, message="Perfil atualizado.")
