from django.contrib import admin
from .models import *

admin.site.register(User)
admin.site.register(Office)
admin.site.register(Case)
admin.site.register(Transfer)
admin.site.register(Assignment)
admin.site.register(CaseStatusHistory)
admin.site.register(CaseFeedback)
admin.site.register(RoleHierarchy)
admin.site.register(Announcement)
admin.site.register(Notification)
  
# Register your models here.

