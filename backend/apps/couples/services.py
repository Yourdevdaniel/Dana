from core.exceptions import BusinessException
from core.services import BaseService

from .repositories import CoupleGroupRepository


class CoupleGroupService(BaseService):
    repository_class = CoupleGroupRepository

    def create_group(self, user, name: str):
        if user.couple_group:
            raise BusinessException("Você já pertence a um grupo de casal.")
        group = self.repository.create(name=name)
        user.couple_group = group
        user.save(update_fields=["couple_group"])
        return group

    def join_group(self, user, invite_code: str):
        if user.couple_group:
            raise BusinessException("Você já pertence a um grupo de casal.")
        group = self.repository.get_by_invite_code(invite_code)
        if not group:
            raise BusinessException("Código de convite inválido.")
        if group.members.count() >= 2:
            raise BusinessException("Grupo já está completo.")
        user.couple_group = group
        user.save(update_fields=["couple_group"])
        return group

    def leave_group(self, user):
        if not user.couple_group:
            raise BusinessException("Você não pertence a um grupo.")
        user.couple_group = None
        user.save(update_fields=["couple_group"])
