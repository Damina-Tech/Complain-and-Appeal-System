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

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Case, CaseStatusHistory, Office, CaseFeedback
from .serializers import CaseSerializer, CaseFeedbackSerializer

User = get_user_model()


def is_citizen(user: User) -> bool:
    return user.groups.filter(name="Citizen").exists()


class CaseAccessPermission(BasePermission):
    """
    - Citizens: can list/retrieve ONLY their cases; can create only for themselves;
                can submit_feedback / submit_appeal on their own case;
                cannot update/destroy/change_status.
    - Staff/Admins (non-citizen or superuser): full access.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Citizens:
        if is_citizen(user):
            # Allowed view actions for citizens
            allowed_actions = {"list", "retrieve", "create", "submit_feedback", "submit_appeal", "mark_seen"}
            # .action is set for actions; for plain methods (list/create/retrieve/update) DRF sets accordingly
            action = getattr(view, "action", None)
            if action in allowed_actions:
                return True
            # For plain HTTP methods without action resolution (rare), allow only safe reads
            if request.method in SAFE_METHODS:
                return True
            return False

        # Staff / admins
        return True

    def has_object_permission(self, request, view, obj: Case):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Staff/admins: full object access
        if not is_citizen(user) or user.is_superuser:
            return True

        # Citizens: object must belong to them
        is_owner = (obj.citizen_id_id == user.id)

        # Citizens can view their own objects
        if request.method in SAFE_METHODS and is_owner:
            return True

        action = getattr(view, "action", None)

        # Citizens may retrieve their own case
        if action == "retrieve" and is_owner:
            return True

        # Citizens may mark_seen / submit_feedback / submit_appeal on their own case
        if action in {"mark_seen", "submit_feedback", "submit_appeal"} and is_owner:
            return True

        # Citizens may create (object-level doesn’t apply yet), updates/deletes not allowed
        if action == "create":
            return True

        # Otherwise deny
        return False


class CaseViewSet(viewsets.ModelViewSet):
    """
    CRUD for Case with:
    - citizen scoping (citizens only see their cases)
    - soft delete
    - status change tracking (history)
    - mark seen
    - feedback & appeal (citizen-owned only)
    """
    queryset = (
        Case.objects
        .filter(deleted_by__isnull=True)
        .select_related("citizen_id", "office_id", "added_by", "status_changed_by", "last_seen_by", "parent_case")
    )
    serializer_class = CaseSerializer
    permission_classes = [permissions.IsAuthenticated, CaseAccessPermission]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Citizens only see their own cases
        if is_citizen(user):
            return qs.filter(citizen_id=user)

        # Staff/admins see all (already filtered by deleted_by__isnull)
        return qs

    def perform_create(self, serializer):
        # If the creator is a citizen, force the case owner to be themselves
        if is_citizen(self.request.user):
            case = serializer.save(added_by=self.request.user, citizen_id=self.request.user)
        else:
            # Staff/internal can create for any citizen; if citizen_id missing, default to current user
            citizen = serializer.validated_data.get("citizen_id") or self.request.user
            case = serializer.save(added_by=self.request.user, citizen_id=citizen)

        CaseStatusHistory.objects.create(
            case=case,
            status=case.status,
            changed_by=self.request.user
        )

    def update(self, request, *args, **kwargs):
        """Ensure status change is tracked with history + status_changed_by."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()  # object permission checked

        # Citizens are blocked by CaseAccessPermission.has_permission(), but keep defensive check:
        if is_citizen(request.user):
            return Response({"detail": "Not permitted."}, status=403)

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
        instance = self.get_object()  # object permission checked
        # Citizens are blocked by permission class; staff proceed:
        instance.deleted_by = request.user
        instance.save(update_fields=["deleted_by"])
        return Response({"message": "Case marked as deleted."}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        """POST { 'status': 'resolved' } -> updates status + records history (staff only)."""
        if is_citizen(request.user):
            return Response({"detail": "Not permitted."}, status=403)

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
        instance = self.get_object()  # object permission checked
        instance.last_seen_by = request.user
        instance.save(update_fields=["last_seen_by"])
        return Response({"message": "Marked as seen."}, status=200)

    @action(detail=True, methods=["post"])
    def submit_feedback(self, request, pk=None):
        case = self.get_object()  # object permission checked
        if case.citizen_id_id != request.user.id:
            return Response({"detail": "Only the case owner can submit feedback."}, status=403)
        if case.status != "closed":
            return Response({"detail": "Feedback can only be submitted after the case is Closed."}, status=400)

        ser = CaseFeedbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        from django.db import IntegrityError
        try:
            feedback = CaseFeedback.objects.create(
                case=case,
                created_by=request.user,
                rating=ser.validated_data["rating"],
                comment=ser.validated_data.get("comment", "")
            )
        except IntegrityError:
            return Response({"detail": "Feedback already submitted for this case by this user."}, status=400)

        CaseStatusHistory.objects.create(case=case, status=case.status, changed_by=request.user)
        return Response(CaseFeedbackSerializer(feedback).data, status=201)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def submit_appeal(self, request, pk=None):
        base_case = self.get_object()  # object permission checked
        if base_case.citizen_id_id != request.user.id:
            return Response({"detail": "Only the case owner can submit an appeal."}, status=403)
        if base_case.status != "closed":
            return Response({"detail": "Appeal can only be submitted after the case is Closed."}, status=400)

        to_office_id = request.data.get("to_office_id")
        reason = request.data.get("reason", "")

        target_office = base_case.office_id
        if to_office_id:
            try:
                target_office = Office.objects.get(pk=to_office_id)
            except Office.DoesNotExist:
                return Response({"detail": "to_office_id not found."}, status=400)

        appeal_case = Case.objects.create(
            parent_case=base_case,
            citizen_id=base_case.citizen_id,
            office_id=target_office,
            category_id="appeal",
            channel="web",
            priority=base_case.priority,
            status="pending",
            added_by=request.user,
        )
        CaseStatusHistory.objects.create(case=appeal_case, status="pending", changed_by=request.user)

        if reason:
            CaseFeedback.objects.create(case=appeal_case, created_by=request.user, rating=5, comment=f"[Appeal Reason] {reason}")

        return Response(self.get_serializer(appeal_case).data, status=201)


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