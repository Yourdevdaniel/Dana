from core.services import BaseService

from .repositories import UserRepository


class UserService(BaseService):
    repository_class = UserRepository

    def get_profile(self, user):
        return user

    def update_profile(self, user, data: dict):
        return self.repository.update(user, **data)
