from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.

class User(AbstractUser):
    national_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True) 
    last_seen = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default='active')  # e.g
    deleted_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_users')
    added_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='added_users')
    status_changed_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='status_changed_users')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)   


class Office(models.Model):
    name = models.CharField(max_length=150, unique=True)

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
    citizen_id      = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cases_reported")
    office_id       = models.ForeignKey(Office, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases")
    title           = models.CharField(max_length=500, null=True, blank=True)  # optional title for the case
    description     = models.TextField(null=True, blank=True)  # detailed description of the case
    category_id     = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="complaint")
    channel         = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="web")
    priority        = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Tracking
    created_at          = models.DateTimeField(auto_now_add=True)
    added_by            = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_added")
    status_changed_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_status_changed")
    deleted_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_deleted")
    last_seen_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases_last_seen_by")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Case #{self.pk} ({self.get_category_id_display()})"


class CaseStatusHistory(models.Model):
    case        = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="status_history")
    status      = models.CharField(max_length=20, choices=Case.STATUS_CHOICES)
    changed_at  = models.DateTimeField(auto_now_add=True)
    changed_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="case_status_changes")

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"Case {self.case_id} -> {self.status} @ {self.changed_at:%Y-%m-%d %H:%M}"
