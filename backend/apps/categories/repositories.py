from core.repositories import BaseRepository

from .models import Category


class CategoryRepository(BaseRepository):
    model = Category

    def list_for_user(self, user):
        return self.model.objects.filter(
            models.Q(user=user) | models.Q(is_system=True)
        )

    def list(self, **filters):
        from django.db.models import Q
        user = filters.pop("user", None)
        qs = self.model.objects.all()
        if user:
            qs = qs.filter(Q(user=user) | Q(is_system=True))
        return qs.filter(**filters)
