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