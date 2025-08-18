from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .serializers import UserSerializer

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Save user with 'added_by'
        user = serializer.save(added_by=self.request.user)
        if serializer.validated_data.get("password"):
            user.set_password(serializer.validated_data["password"])
            user.save()

    def perform_update(self, serializer):
        # Save user with 'status_changed_by'
        user = serializer.save(status_changed_by=self.request.user)
        if serializer.validated_data.get("password"):
            user.set_password(serializer.validated_data["password"])
            user.save()

    def destroy(self, request, *args, **kwargs):
        # Soft delete instead of actual delete
        instance = self.get_object()
        instance.deleted_by = request.user
        instance.status = "deleted"
        instance.save()
        return Response({"message": "User marked as deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        # Exclude deleted users
        return User.objects.exclude(status="deleted")
