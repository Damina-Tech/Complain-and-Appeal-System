from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .serializers import *
from .models import *
from django.db import transaction
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
from django.db.models import Count, Q
from django.utils.dateparse import parse_date

User = get_user_model()

class IsSelfOrStaff(permissions.BasePermission):
    """Allow users to see/update themselves; staff can access anyone."""
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_authenticated and request.user.is_staff:
            return True
        return request.user.is_authenticated and obj.pk == request.user.pk


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    # default; we’ll override per-action in get_permissions()
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create"]:               # self-registration
            return [permissions.AllowAny()]
        if self.action in ["retrieve", "partial_update", "update"]:
            return [permissions.IsAuthenticated(), IsSelfOrStaff()]
        if self.action in ["list", "destroy"]:
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return super().get_permissions()

    def get_queryset(self):
        # Staff/admins can list; others can only see self (handled by permissions above).
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return super().get_queryset().exclude(status="deleted")
        # Non-staff: queryset is limited to self to avoid leaking existence via list.
        return User.objects.filter(pk=self.request.user.pk).exclude(status="deleted")

    def perform_create(self, serializer):
        # For self-registration, request.user may be Anonymous; added_by stays None.
        user = serializer.save(added_by=self.request.user if self.request.user.is_authenticated else None)

        # Hash password if provided
        pwd = serializer.validated_data.get("password")
        if pwd:
            user.set_password(pwd)
            user.save(update_fields=["password"])

        # Put every newly registered user into 'Citizen' by default
        citizen_group, _ = Group.objects.get_or_create(name="Citizen")
        user.groups.add(citizen_group)

    def perform_update(self, serializer):
        # Only self or staff gets here (checked by IsSelfOrStaff)
        user = serializer.save(status_changed_by=self.request.user)
        pwd = serializer.validated_data.get("password")
        if pwd:
            user.set_password(pwd)
            user.save(update_fields=["password"])

    def destroy(self, request, *args, **kwargs):
        # Only admins can destroy (permission enforced in get_permissions)
        instance = self.get_object()
        instance.deleted_by = request.user
        instance.status = "deleted"
        instance.save(update_fields=["deleted_by", "status"])
        return Response({"message": "User marked as deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


def is_citizen(user):
    return user.groups.filter(name="Citizen").exists()


class CaseAccessPermission(BasePermission):
    """
    - Citizens: can list/retrieve ONLY their cases; can create only for themselves;
                can update/partial_update their own cases;
                can submit_feedback / submit_appeal / mark_seen on their own cases;
                cannot destroy/change_status.
    - Staff/Admins (non-citizen or superuser): full access.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_citizen(user):
            allowed_actions = {
                "list", "retrieve", "create",
                "update", "partial_update",
                "submit_feedback", "submit_appeal", "mark_seen",
            }
            action = getattr(view, "action", None)
            if action in allowed_actions:
                return True
            if request.method in SAFE_METHODS:
                return True
            return False

        # staff/admins
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # staff/admins get full object access
        if not is_citizen(user) or user.is_superuser:
            return True

        # citizens: object must be theirs
        is_owner = (obj.citizen_id_id == user.id)

        if request.method in SAFE_METHODS and is_owner:
            return True

        action = getattr(view, "action", None)

        # allow retrieve / update / partial_update on own case
        if action in {"retrieve", "update", "partial_update"} and is_owner:
            return True

        # allow mark_seen / submit_feedback / submit_appeal on own case
        if action in {"mark_seen", "submit_feedback", "submit_appeal"} and is_owner:
            return True

        if action == "create":
            return True

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
        """
        Allow citizens to edit ONLY specific fields on their own cases;
        staff can edit everything. Still track status history on real status changes.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()  # object-level permission already checked
        previous_status = instance.status

        data = request.data.copy()

        # If editor is a citizen, restrict editable fields
        if is_citizen(request.user):
            # choose the fields you want citizens to be able to change:
            allowed = {"title", "description", "attachments", "channel"}
            # Option A: silently drop forbidden fields
            for key in list(data.keys()):
                if key not in allowed:
                    data.pop(key, None)

        serializer = self.get_serializer(instance, data=data, partial=partial)
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

    def perform_create(self, serializer):
        # auto-attach who created the office
        serializer.save(added_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        # update tracking
        serializer.save(updated_by=self.request.user)
        
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
    

class GroupViewSet(viewsets.ModelViewSet):
    """
    /groups/                      GET, POST
    /groups/{id}/                 GET, PUT, PATCH, DELETE

    Custom:
    /groups/{id}/users/           GET
    /groups/{id}/add_users/       POST { "user_ids": [1,2] }
    /groups/{id}/remove_users/    POST { "user_ids": [1,2] }
    /groups/{id}/set_users/       PUT  { "user_ids": [1,2] }

    /groups/{id}/permissions/     GET
    /groups/{id}/add_permissions/ POST { "permission_ids": [10,11] }
    /groups/{id}/remove_permissions/ POST { "permission_ids": [10,11] }
    /groups/{id}/set_permissions/ PUT  { "permission_ids": [10,11] }
    """
    queryset = Group.objects.all().prefetch_related("permissions", "user_set")
    serializer_class = GroupSerializer

    # optional: filters/search (works out of the box if django-filter installed)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        "permissions": ["exact"],
        "permissions__codename": ["exact", "in"],
        "name": ["exact", "icontains"],
    }
    search_fields = ["name", "permissions__codename", "permissions__name", "user_set__username", "user_set__email"]
    ordering_fields = ["name", "id"]
    ordering = ["name"]

    # ---------- Users in a group ----------
    @action(detail=True, methods=["get"], url_path="users")
    def users(self, request, pk=None):
        g = self.get_object()
        data = list(g.user_set.order_by("username").values("id", "username", "email", "is_active"))
        return Response(data)

    @action(detail=True, methods=["post"], url_path="add_users")
    def add_users(self, request, pk=None):
        g = self.get_object()
        ids = request.data.get("user_ids", [])
        users = User.objects.filter(id__in=ids)
        for u in users:
            u.groups.add(g)
        return Response({"added": list(users.values_list("id", flat=True))}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="remove_users")
    def remove_users(self, request, pk=None):
        g = self.get_object()
        ids = request.data.get("user_ids", [])
        users = User.objects.filter(id__in=ids)
        for u in users:
            u.groups.remove(g)
        return Response({"removed": list(users.values_list("id", flat=True))}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put"], url_path="set_users")
    def set_users(self, request, pk=None):
        g = self.get_object()
        new_ids = set(request.data.get("user_ids", []))
        current_ids = set(g.user_set.values_list("id", flat=True))

        # remove missing
        for uid in current_ids - new_ids:
            user = User.objects.filter(id=uid).first()
            if user:
                user.groups.remove(g)
        # add new
        for uid in new_ids - current_ids:
            user = User.objects.filter(id=uid).first()
            if user:
                user.groups.add(g)

        return Response({"users": sorted(list(new_ids))}, status=status.HTTP_200_OK)

    # ---------- Permissions in a group ----------
    @action(detail=True, methods=["get"], url_path="permissions")
    def list_permissions(self, request, pk=None):
        g = self.get_object()
        data = list(g.permissions.order_by("codename").values("id", "codename", "name"))
        return Response(data)

    @action(detail=True, methods=["post"], url_path="add_permissions")
    def add_permissions(self, request, pk=None):
        g = self.get_object()
        ids = request.data.get("permission_ids", [])
        perms = Permission.objects.filter(id__in=ids)
        g.permissions.add(*perms)
        return Response({"added": list(perms.values_list("id", flat=True))}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="remove_permissions")
    def remove_permissions(self, request, pk=None):
        g = self.get_object()
        ids = request.data.get("permission_ids", [])
        perms = Permission.objects.filter(id__in=ids)
        g.permissions.remove(*perms)
        return Response({"removed": list(perms.values_list("id", flat=True))}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put"], url_path="set_permissions")
    def set_permissions(self, request, pk=None):
        g = self.get_object()
        ids = request.data.get("permission_ids", [])
        perms = Permission.objects.filter(id__in=ids)
        g.permissions.set(perms)
        return Response({"permissions": list(perms.values_list("id", flat=True))}, status=status.HTTP_200_OK)

class ReportsPermission(permissions.BasePermission):
    """
    Citizens can see only reports of their own cases.
    Officials (non-citizens) and superusers can see everything.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, ReportsPermission]

    # ---- helpers ----
    def _filtered_cases(self, request):
        qs = Case.objects.filter(deleted_by__isnull=True)

        # citizen scoping
        if is_citizen(request.user):
            qs = qs.filter(citizen_id=request.user)

        # optional filters
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        office = request.query_params.get("office")
        category = request.query_params.get("category")
        status = request.query_params.get("status")

        if start:
            d = parse_date(start)
            if d:
                qs = qs.filter(created_at__date__gte=d)
        if end:
            d = parse_date(end)
            if d:
                qs = qs.filter(created_at__date__lte=d)
        if office:
            qs = qs.filter(office_id_id=office)
        if category:
            qs = qs.filter(category_id=category)
        if status:
            qs = qs.filter(status=status)

        return qs.select_related("office_id", "citizen_id")

    # ---- /reports/summary/ ----
    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        qs = self._filtered_cases(request)

        # total counts by status
        status_counts = qs.values("status").annotate(total=Count("id"))
        by_status = {row["status"]: row["total"] for row in status_counts}

        total = qs.count()
        data = {
            "total_cases": total,
            "pending": by_status.get("pending", 0),
            "investigation": by_status.get("investigation", 0),
            "resolved": by_status.get("resolved", 0),
            "rejected": by_status.get("rejected", 0),
            "closed": by_status.get("closed", 0),
            # A simple "open" definition (not closed or resolved or rejected)
            "open": total - (by_status.get("resolved", 0) + by_status.get("rejected", 0) + by_status.get("closed", 0)),
        }
        return Response(data)

    # ---- /reports/cases_by_status/ ----
    @action(detail=False, methods=["get"], url_path="cases_by_status")
    def cases_by_status(self, request):
        qs = self._filtered_cases(request)
        agg = qs.values("status").annotate(total=Count("id")).order_by("status")
        # -> [{status, total}]
        out = [{"status": r["status"], "total": r["total"]} for r in agg]
        return Response(out)

    # ---- /reports/cases_by_office/ ----
    @action(detail=False, methods=["get"], url_path="cases_by_office")
    def cases_by_office(self, request):
        qs = self._filtered_cases(request)
        agg = qs.values("office_id__id", "office_id__name").annotate(total=Count("id")).order_by("office_id__name")
        out = [
            {
                "office_id": r["office_id__id"],
                "office_name": r["office_id__name"] or "Unassigned",
                "total": r["total"],
            }
            for r in agg
        ]
        return Response(out)

    # ---- /reports/cases_by_category/ ----
    @action(detail=False, methods=["get"], url_path="cases_by_category")
    def cases_by_category(self, request):
        qs = self._filtered_cases(request)
        agg = qs.values("category_id").annotate(total=Count("id")).order_by("category_id")
        out = [{"category": r["category_id"], "total": r["total"]} for r in agg]
        return Response(out)

    # ---- /reports/top_assignees/ ----
    @action(detail=False, methods=["get"], url_path="top_assignees")
    def top_assignees(self, request):
        """
        Rank users by how many assignments they received (to_user_id).
        For citizens: only counts assignments on their own cases.
        Optional filters apply via _filtered_cases.
        """
        case_ids = list(self._filtered_cases(request).values_list("id", flat=True))
        q = Assignment.objects.filter(case_id_id__in=case_ids)

        agg = (
            q.values("to_user_id")
             .annotate(total=Count("id"))
             .order_by("-total")[:10]
        )

        # Fetch user basics in one go
        user_map = {
            u.id: u for u in User.objects.filter(id__in=[row["to_user_id"] for row in agg])
        }
        out = []
        for row in agg:
            u = user_map.get(row["to_user_id"])
            out.append({
                "user_id": row["to_user_id"],
                "username": getattr(u, "username", None),
                "first_name": getattr(u, "first_name", ""),
                "last_name": getattr(u, "last_name", ""),
                "total": row["total"],
            })
        return Response(out)
    

DIRECTOR_AND_ABOVE = {"Director", "President Office", "President"}

def is_citizen(user):
    return user.is_authenticated and user.groups.filter(name="Citizen").exists()

def is_director_or_above(user):
    return user.is_authenticated and user.groups.filter(name__in=DIRECTOR_AND_ABOVE).exists()

class AnnouncementPermission(BasePermission):
    """
    - Anyone authenticated can READ (list/retrieve).
    - Only Director & above (or superuser) can CREATE/UPDATE/DELETE.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        # non-safe methods
        return user.is_superuser or is_director_or_above(user)

    def has_object_permission(self, request, view, obj):
        # same rules object-level
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_superuser or is_director_or_above(request.user)
    
class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated, AnnouncementPermission]

    def get_queryset(self):
        """
        Everyone sees active announcements by default.
        Optionally filter for the current user's audience.
        Query params:
          - all=1            -> include inactive too (director & above only)
          - for_me=1         -> only those targeted to my roles/offices (or public)
          - office=<id>      -> narrow by office id
        """
        qs = Announcement.objects.all()

        # Unless privileged, show only active
        user = self.request.user
        if not (user.is_superuser or is_director_or_above(user)):
            qs = qs.filter(is_active=True)

        # filter by office
        office_id = self.request.query_params.get("office")
        if office_id:
            qs = qs.filter(recipients_offices=office_id) | qs.filter(recipients_offices__isnull=True)

        # include inactive if explicitly requested and user is privileged
        if self.request.query_params.get("all") != "1":
            qs = qs.filter(is_active=True)

        # for_me: returns announcements targeted to user's roles/offices, or public (no recipients set)
        if self.request.query_params.get("for_me") == "1":
            # user roles
            user_group_ids = list(user.groups.values_list("id", flat=True))
            # note: if you later add user.office relation, use it here.
            qs = qs.filter(
                models.Q(recipients_groups__isnull=True, recipients_offices__isnull=True) |
                models.Q(recipients_groups__in=user_group_ids) |
                models.Q(recipients_offices__isnull=True)  # still public by office
            ).distinct()

        return qs.distinct().order_by("-created_at")

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save(updated_by=self.request.user)

    # Optional: quick publish/unpublish toggle (Director+)
    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        ann = self.get_object()
        ann.is_active = not ann.is_active
        ann.updated_by = request.user
        ann.save(update_fields=["is_active", "updated_by", "updated_at"])
        return Response({"id": ann.id, "is_active": ann.is_active})