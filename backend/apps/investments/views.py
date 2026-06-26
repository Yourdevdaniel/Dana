from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsOwner
from core.responses import success_response

from . import services
from .models import Investment
from .serializers import InvestmentCreateSerializer, InvestmentSerializer


class InvestmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return InvestmentCreateSerializer if self.request.method == "POST" else InvestmentSerializer

    def list(self, request, *args, **kwargs):
        return success_response(data=InvestmentSerializer(self.get_queryset(), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        investment = serializer.save(user=request.user)
        return success_response(
            data=InvestmentSerializer(investment).data,
            message="Investimento registrado.",
            status=201,
        )


class InvestmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return InvestmentCreateSerializer if self.request.method in ("PUT", "PATCH") else InvestmentSerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=InvestmentSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            data=InvestmentSerializer(serializer.instance).data,
            message="Investimento atualizado.",
        )

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return success_response(message="Investimento removido.")


class InvestmentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = services.get_summary(request.user)
        return success_response(data=summary)
