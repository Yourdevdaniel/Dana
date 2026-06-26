import os

import dj_database_url

from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "dana-8kpu.onrender.com").split(",")
    if host.strip()
]

# WhiteNoise após SecurityMiddleware (CorsMiddleware está em [0], Security em [1])
MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# PostgreSQL: DATABASE_URL já é lido em base.py via os.environ.
# Aqui apenas aplica ssl_require=False para URLs internas do Render.
_db_url = os.environ.get("DATABASE_URL")
if _db_url:
    DATABASES = {"default": dj_database_url.parse(_db_url, conn_max_age=600, ssl_require=False)}  # noqa: F405

# CORS — usa env var se definida; fallback garante o domínio do Vercel
_cors_raw = os.getenv("CORS_ALLOWED_ORIGINS", "https://dana-two-alpha.vercel.app")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()]  # noqa: F405
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

# Segurança HTTPS
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
