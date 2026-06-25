class BaseRepository:
    model = None

    def get_by_id(self, pk):
        return self.model.objects.get(pk=pk)

    def list(self, **filters):
        return self.model.objects.filter(**filters)

    def create(self, **data):
        return self.model.objects.create(**data)

    def update(self, instance, **data):
        for attr, value in data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def delete(self, instance):
        if hasattr(instance, "soft_delete"):
            instance.soft_delete()
        else:
            instance.delete()
