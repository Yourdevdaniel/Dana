from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOwner
from core.responses import success_response

from .models import CreditCard
from .serializers import CreditCardSerializer


class CreditCardListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CreditCardSerializer

    def get_queryset(self):
        return CreditCard.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        return success_response(data=CreditCardSerializer(self.get_queryset(), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        card = serializer.save(user=request.user)
        return success_response(
            data=CreditCardSerializer(card).data,
            message="Cartão registrado.",
            status=201,
        )


class CreditCardDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = CreditCardSerializer

    def get_queryset(self):
        return CreditCard.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=CreditCardSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            data=CreditCardSerializer(serializer.instance).data,
            message="Cartão atualizado.",
        )

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return success_response(message="Cartão removido.")
