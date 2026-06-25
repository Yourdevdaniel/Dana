from core.repositories import BaseRepository

from .models import AuditLog


class AuditLogRepository(BaseRepository):
    model = AuditLog
