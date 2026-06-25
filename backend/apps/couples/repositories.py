from core.repositories import BaseRepository

from .models import CoupleGroup


class CoupleGroupRepository(BaseRepository):
    model = CoupleGroup

    def get_by_invite_code(self, code: str):
        return self.model.objects.filter(invite_code=code).first()
