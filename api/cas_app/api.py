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
    queryset = Case.objects.filter(deleted_by__isnull=True).select_related("citizen_id", "office_id", "added_by", "status_changed_by", "last_seen_by", "parent_case")
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
    
     # ---------- NEW: FEEDBACK ----------
    @action(detail=True, methods=["post"])
    def submit_feedback(self, request, pk=None):
        """
        Citizen submits feedback only if the case is 'closed'.
        Payload: { "rating": 5, "comment": "thanks" }
        """
        case = self.get_object()

        # Guard: only the citizen who reported the case can give feedback
        if case.citizen_id_id != request.user.id:
            return Response({"detail": "Only the case owner can submit feedback."}, status=403)

        if case.status != "closed":
            return Response({"detail": "Feedback can only be submitted after the case is Closed."}, status=400)

        ser = CaseFeedbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # One feedback per citizen per case (enforced in model); handle duplicate gracefully
        try:
            feedback = CaseFeedback.objects.create(
                case=case,
                created_by=request.user,
                rating=ser.validated_data["rating"],
                comment=ser.validated_data.get("comment", "")
            )
        except Exception:
            return Response({"detail": "Feedback already submitted for this case by this user."}, status=400)

        # (Optional) record a status history echo to show "closed (feedback)"
        CaseStatusHistory.objects.create(case=case, status=case.status, changed_by=request.user)

        return Response(CaseFeedbackSerializer(feedback).data, status=201)

    # ---------- NEW: APPEAL ----------
    @transaction.atomic
    @action(detail=True, methods=["post"])
    def submit_appeal(self, request, pk=None):
        """
        Citizen submits an appeal only if the base case is 'closed'.
        Payload (optional): { "to_office_id": 5, "reason": "Not satisfied" }
        Behavior:
          - Creates a NEW Case with category='appeal', parent_case=<this case>, status='pending'
          - Copies citizen, assigns office (same as original or provided to_office_id)
          - Writes initial status history for the new appeal case
        """
        base_case = self.get_object()

        # Guard: only owner can appeal
        if base_case.citizen_id_id != request.user.id:
            return Response({"detail": "Only the case owner can submit an appeal."}, status=403)

        if base_case.status != "closed":
            return Response({"detail": "Appeal can only be submitted after the case is Closed."}, status=400)

        to_office_id = request.data.get("to_office_id")
        reason = request.data.get("reason", "")

        # Choose target office: provided one or keep same as base
        target_office = base_case.office_id
        if to_office_id:
            from .models import Office
            try:
                target_office = Office.objects.get(pk=to_office_id)
            except Office.DoesNotExist:
                return Response({"detail": "to_office_id not found."}, status=400)

        # Create child appeal case
        appeal_case = Case.objects.create(
            parent_case=base_case,
            citizen_id=base_case.citizen_id,
            office_id=target_office,
            category_id="appeal",
            channel="web",
            priority=base_case.priority,  # or default 'medium'
            status="pending",
            added_by=request.user,         # actor initiating appeal
        )
        CaseStatusHistory.objects.create(case=appeal_case, status="pending", changed_by=request.user)

        # (Optional) you might want to add a “note” somewhere; simplest is to add a feedback comment as evidence log, or
        # store reason in a separate "CaseNote" model if you plan to have notes. For now we can reuse feedback as an audit:
        if reason:
            CaseFeedback.objects.create(case=appeal_case, created_by=request.user, rating=5, comment=f"[Appeal Reason] {reason}")

        data = self.get_serializer(appeal_case).data
        return Response(data, status=201)


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