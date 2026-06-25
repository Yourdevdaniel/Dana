from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
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


def _send_verification_email(user, token):
    url = f"{settings.FRONTEND_URL}/verify-email/{token}"
    send_mail(
        subject="Verifique seu email – Finance Couple",
        message=(
            f"Olá {user.name},\n\n"
            f"Clique no link abaixo para verificar seu email:\n{url}\n\n"
            "O link expira em 24 horas.\n\n"
            "Se você não criou esta conta, ignore este email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


@method_decorator(ratelimit(key="ip", rate="10/m", method="POST", block=True), name="post")
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = user.generate_verification_token()
        _send_verification_email(user, token)
        refresh = RefreshToken.for_user(user)
        return success_response(
            data={
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            message="Conta criada. Verifique seu email para ativar o login.",
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


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, _request, token):
        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return error_response(message="Token inválido.", status=400)

        if user.is_email_verified:
            return success_response(message="Email já verificado.")

        if not user.email_verification_expires or user.email_verification_expires < timezone.now():
            return error_response(
                message="Token expirado. Solicite um novo link de verificação.", status=400
            )

        user.is_email_verified = True
        user.email_verification_expires = None
        user.save(update_fields=["is_email_verified", "email_verification_expires"])
        return success_response(message="Email verificado com sucesso. Você já pode fazer login.")


@method_decorator(ratelimit(key="ip", rate="3/m", method="POST", block=True), name="post")
class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        # Neutral response — never confirm if email exists
        neutral = success_response(message="Se o email estiver cadastrado, um link será enviado.")
        if not email:
            return neutral
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return neutral
        if user.is_email_verified:
            return neutral
        token = user.generate_verification_token()
        _send_verification_email(user, token)
        return neutral


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
        user, created = User.objects.get_or_create(
            email=email,
            defaults={"name": name, "is_email_verified": True},
        )
        if not created and not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

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
