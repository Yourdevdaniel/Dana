from core.repositories import BaseRepository

from .models import User


class UserRepository(BaseRepository):
    model = User

    def get_by_email(self, email: str):
        return self.model.objects.filter(email=email).first()
