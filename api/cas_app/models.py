from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import Group
# Create your models here.

class User(AbstractUser):
    national_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True) 
    address = models.TextField(null=True, blank=True)  # Optional address field
    office = models.ForeignKey('Office', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    last_seen = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default='active')  # e.g
    deleted_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_users')
    added_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='added_users')
    status_changed_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='status_changed_users')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)   


class Office(models.Model):
    name = models.CharField(max_length=150, unique=True)
    # office_representative = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="offices_represented")
    phone_number = models.CharField(max_length=15, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    added_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="offices_added"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="offices_updated"
    )
    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Case(models.Model):
    # enums kept simple for now; adjust as needed
    CATEGORY_CHOICES = [
        ("complaint", "Complaint"),
        ("appeal", "Appeal"),
        ("other", "Other"),
    ]
    CHANNEL_CHOICES = [
        ("web", "Web"),
        ("walk_in", "Walk-in"),
        ("phone", "Phone"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),  # newly created
        ("investigation", "In Investigation"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
        ("closed", "Closed"),
    ]

    # Core fields (using *_id names where you asked; category_id kept as string choice)
    parent_case       = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="child_cases")

    citizen_id      = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cases_reported")
    office_id       = models.ForeignKey(Office, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases")
    title           = models.CharField(max_length=500, null=True, blank=True)  # optional title for the case
    description     = models.TextField(null=True, blank=True)  # detailed description of the case
    category_id     = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="complaint")
    channel         = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="web")
    priority        = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    attachments     = models.JSONField(default=list, blank=True)  # list of file URLs or IDs

    # Tracking
    created_at          = models.DateTimeField(auto_now_add=True)
    added_by            = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_added")
    status_changed_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_status_changed")
    deleted_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_deleted")
    last_seen_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_last_seen_by")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_category_id_display()})"


class CaseStatusHistory(models.Model):
    case        = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="status_history")
    status      = models.CharField(max_length=20, choices=Case.STATUS_CHOICES)
    changed_at  = models.DateTimeField(auto_now_add=True)
    changed_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="case_status_changes")

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"Case {self.case_id} -> {self.status} @ {self.changed_at:%Y-%m-%d %H:%M}"

# NEW: one feedback per citizen per case
class CaseFeedback(models.Model):
    case        = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="feedbacks")
    created_by  = models.ForeignKey(User, on_delete=models.CASCADE, related_name="case_feedbacks")
    rating      = models.PositiveSmallIntegerField()  # 1–5 typical
    comment     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("case", "created_by")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Feedback Case#{self.case_id_id} by {self.created_by_id} ({self.rating})"


class Transfer(models.Model):
    case_id         = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="transfers")
    from_office_id  = models.ForeignKey(Office, on_delete=models.PROTECT, related_name="transfers_out")
    to_office_id    = models.ForeignKey(Office, on_delete=models.PROTECT, related_name="transfers_in")
    reason          = models.TextField(blank=True)
    timestamp       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Transfer Case#{self.case_id_id} {self.from_office_id} -> {self.to_office_id} @ {self.timestamp:%Y-%m-%d %H:%M}"


class Assignment(models.Model):
    case_id       = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="assignments")
    from_user_id  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assignments_out")
    to_user_id    = models.ForeignKey(User, on_delete=models.PROTECT, related_name="assignments_in")
    reason        = models.TextField(blank=True)
    timestamp     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Assignment Case#{self.case_id_id} {self.from_user_id} -> {self.to_user_id} @ {self.timestamp:%Y-%m-%d %H:%M}"
    
class Announcement(models.Model):
    title       = models.CharField(max_length=200)
    content     = models.TextField()
    is_active   = models.BooleanField(default=True)

    # audience
    recipients_groups  = models.ManyToManyField(Group, blank=True, related_name="announcements")   # roles
    recipients_offices = models.ManyToManyField(Office, blank=True, related_name="announcements")  # offices

    # audit
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="ann_created")
    updated_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="ann_updated")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title