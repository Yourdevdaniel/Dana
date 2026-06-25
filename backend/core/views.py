from core.responses import error_response


def ratelimit_handler(_request, _exception):
    return error_response(
        message="Muitas requisições. Tente novamente em alguns instantes.",
        errors=[{"field": "rate_limit", "message": "Limite de requisições atingido."}],
        status=429,
    )
