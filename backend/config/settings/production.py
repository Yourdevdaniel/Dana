import os

import dj_database_url
from decouple import config

from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "").split(",")
    if host.strip()
]

# WhiteNoise após SecurityMiddleware (CorsMiddleware está em [0], Security em [1])
MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# PostgreSQL via DATABASE_URL (Render fornece automaticamente)
_db_url = config("DATABASE_URL", default=None)
if _db_url:
    DATABASES = {"default": dj_database_url.parse(_db_url, conn_max_age=600, ssl_require=True)}  # noqa: F405

# CORS — só sobrescreve base.py se a variável estiver definida no ambiente
_cors_raw = os.getenv("CORS_ALLOWED_ORIGINS", "")
if _cors_raw.strip():
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()]  # noqa: F405

_csrf_raw = os.getenv("CSRF_TRUSTED_ORIGINS", _cors_raw)
if _csrf_raw.strip():
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_raw.split(",") if o.strip()]

# Segurança HTTPS
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
