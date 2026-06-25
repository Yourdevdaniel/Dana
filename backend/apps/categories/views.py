from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOwner
from core.responses import success_response

from .models import Category
from .serializers import CategoryCreateSerializer, CategorySerializer


class CategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        return Category.objects.filter(Q(user=self.request.user) | Q(is_system=True))

    def get_serializer_class(self):
        return CategoryCreateSerializer if self.request.method == "POST" else CategorySerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return success_response(data=CategorySerializer(qs, many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return success_response(
            data=CategorySerializer(serializer.instance).data,
            message="Categoria criada.",
            status=201,
        )


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return CategoryCreateSerializer if self.request.method in ("PUT", "PATCH") else CategorySerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=CategorySerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=CategorySerializer(serializer.instance).data, message="Categoria atualizada.")

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete()
        return success_response(message="Categoria removida.")
