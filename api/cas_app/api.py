from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .serializers import *
from .models import *
from django.db import transaction

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]  

    def perform_create(self, serializer):
        user = serializer.save(added_by=self.request.user)
        if serializer.validated_data.get("password"):
            user.set_password(serializer.validated_data["password"])
            user.save()

    def perform_update(self, serializer):
        user = serializer.save(status_changed_by=self.request.user)
        if serializer.validated_data.get("password"):
            user.set_password(serializer.validated_data["password"])
            user.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.deleted_by = request.user
        instance.status = "deleted"
        instance.save()
        return Response({"message": "User marked as deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return User.objects.exclude(status="deleted")

class CaseViewSet(viewsets.ModelViewSet):
    """
    CRUD for Case with:
    - soft delete
    - status change tracking (history)
    - mark seen
    """
    queryset = Case.objects.filter(deleted_by__isnull=True).select_related("citizen_id", "office_id", "added_by", "status_changed_by", "last_seen_by")
    serializer_class = CaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # If citizen_id not provided, default to the current user (external self-report)
        citizen = serializer.validated_data.get("citizen_id") or self.request.user
        case = serializer.save(added_by=self.request.user, citizen_id=citizen)

        # initial status history
        CaseStatusHistory.objects.create(
            case=case,
            status=case.status,
            changed_by=self.request.user
        )

    def update(self, request, *args, **kwargs):
        """Ensure status change is tracked with history + status_changed_by."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        previous_status = instance.status

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        instance.refresh_from_db()
        if instance.status != previous_status:
            instance.status_changed_by = request.user
            instance.save(update_fields=["status_changed_by"])
            CaseStatusHistory.objects.create(
                case=instance,
                status=instance.status,
                changed_by=request.user
            )
        return Response(self.get_serializer(instance).data)

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        # Soft delete
        instance = self.get_object()
        instance.deleted_by = request.user
        instance.save(update_fields=["deleted_by"])
        return Response({"message": "Case marked as deleted."}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        """POST { 'status': 'resolved' }  -> updates status + records history"""
        instance = self.get_object()
        new_status = request.data.get("status")
        valid = dict(Case.STATUS_CHOICES).keys()
        if new_status not in valid:
            return Response({"detail": f"Invalid status. Allowed: {', '.join(valid)}"}, status=400)

        if instance.status != new_status:
            instance.status = new_status
            instance.status_changed_by = request.user
            instance.save(update_fields=["status", "status_changed_by"])
            CaseStatusHistory.objects.create(case=instance, status=new_status, changed_by=request.user)

        return Response(self.get_serializer(instance).data, status=200)

    @action(detail=True, methods=["post"])
    def mark_seen(self, request, pk=None):
        """Mark this case as last seen by the current user."""
        instance = self.get_object()
        instance.last_seen_by = request.user
        instance.save(update_fields=["last_seen_by"])
        return Response({"message": "Marked as seen."}, status=200)


class OfficeViewSet(viewsets.ModelViewSet):
    queryset = Office.objects.all().order_by("name")
    serializer_class = OfficeSerializer
    permission_classes = [permissions.IsAuthenticated]

class TransferViewSet(viewsets.ModelViewSet):
    """
    Creates a transfer and, on success, updates the case.office_id to the destination office.
    """
    queryset = Transfer.objects.select_related("case_id", "from_office_id", "to_office_id")
    serializer_class = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        transfer = serializer.save()
        # reflect the office move on the case
        case = transfer.case_id
        case.office_id = transfer.to_office_id
        case.status_changed_by = self.request.user  # optional: who performed the transfer
        case.save(update_fields=["office_id", "status_changed_by"])

    # Optional quick endpoint to fetch transfers of a case
    @action(detail=False, methods=["get"], url_path="by-case/(?P<case_pk>[^/.]+)")
    def by_case(self, request, case_pk=None):
        qs = self.get_queryset().filter(case_id_id=case_pk)
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)


class AssignmentViewSet(viewsets.ModelViewSet):
    """
    Records a handover between users for a case.
    If from_user_id not supplied, default to request.user for convenience.
    """
    queryset = Assignment.objects.select_related("case_id", "from_user_id", "to_user_id")
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from_user = serializer.validated_data.get("from_user_id")
        if not from_user:
            # Assume the current actor is handing over the case
            serializer.validated_data["from_user_id"] = self.request.user
        serializer.save()

    # Optional quick endpoint to fetch assignments of a case
    @action(detail=False, methods=["get"], url_path="by-case/(?P<case_pk>[^/.]+)")
    def by_case(self, request, case_pk=None):
        qs = self.get_queryset().filter(case_id_id=case_pk)
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)