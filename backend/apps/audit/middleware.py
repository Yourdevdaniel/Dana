import logging

logger = logging.getLogger("audit")

LOGGED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
EXCLUDED_PATHS = {"/admin/", "/api/schema/", "/api/docs/"}

# Número de proxies confiáveis na frente da aplicação (ex: 1 se tiver nginx/lb).
# 0 = sem proxy — usa REMOTE_ADDR diretamente e ignora X-Forwarded-For.
TRUSTED_PROXY_COUNT = 1


def get_client_ip(request):
    """
    Extrai o IP real do cliente sem confiar cegamente em X-Forwarded-For.
    Pega o N-ésimo IP da direita na cadeia, onde N = TRUSTED_PROXY_COUNT.
    Isso protege contra spoofing onde o cliente injeta IPs falsos no início da cadeia.
    """
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded and TRUSTED_PROXY_COUNT > 0:
        ips = [ip.strip() for ip in x_forwarded.split(",")]
        index = max(len(ips) - TRUSTED_PROXY_COUNT, 0)
        return ips[index]
    return request.META.get("REMOTE_ADDR")


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.method in LOGGED_METHODS and not any(
            request.path.startswith(p) for p in EXCLUDED_PATHS
        ):
            self._log(request, response)
        return response

    def _log(self, request, response):
        try:
            from .models import AuditLog

            user = request.user if request.user.is_authenticated else None
            path_parts = request.path.split("/")
            AuditLog.objects.create(
                user=user,
                action=request.method,
                model_name=path_parts[3] if len(path_parts) > 3 else "",
                object_id=str(response.status_code),
                path=request.path,
                ip_address=get_client_ip(request),
            )
        except Exception:
            logger.exception("Falha ao gravar AuditLog para %s %s", request.method, request.path)
