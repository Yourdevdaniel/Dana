from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsCouple(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.couple_group is not None


class IsCoupleOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.couple_group:
            return False
        return obj.user in request.user.couple_group.members.all()
