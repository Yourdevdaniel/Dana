from django.conf import settings
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.users.serializers import RegisterSerializer, UserSerializer
from core.responses import error_response, success_response

from .serializers import LoginSerializer


@method_decorator(ratelimit(key="ip", rate="10/m", method="POST", block=True), name="post")
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return success_response(
            data={
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            message="Conta criada com sucesso.",
            status=201,
        )


@method_decorator(ratelimit(key="ip", rate="10/m", method="POST", block=True), name="post")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return success_response(
            data={
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            message="Login realizado com sucesso.",
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return error_response(message="Refresh token obrigatório.", status=400)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return success_response(message="Logout realizado com sucesso.")
        except TokenError:
            return error_response(message="Token inválido ou expirado.", status=400)


def _verify_google_token(id_token_str):
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    return google_id_token.verify_oauth2_token(
        id_token_str,
        google_requests.Request(),
        settings.GOOGLE_CLIENT_ID,
    )


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token_str = request.data.get("id_token", "").strip()
        if not id_token_str:
            return error_response(message="id_token obrigatório.", status=400)

        try:
            idinfo = _verify_google_token(id_token_str)
        except Exception:
            return error_response(message="Token Google inválido ou expirado.", status=400)

        email = idinfo.get("email", "").lower()
        if not email:
            return error_response(message="Não foi possível obter o email do Google.", status=400)

        name = idinfo.get("name", email.split("@")[0])
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={"name": name},
        )

        if not user.is_active:
            return error_response(message="Conta desativada.", status=403)

        refresh = RefreshToken.for_user(user)
        return success_response(
            data={
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            message="Login com Google realizado com sucesso.",
        )
