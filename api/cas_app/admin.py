from django.contrib import admin
from .models import *

admin.site.register(User)
admin.site.register(Office)
admin.site.register(Case)
admin.site.register(Transfer)
admin.site.register(Assignment)
admin.site.register(CaseStatusHistory)
admin.site.register(CaseFeedback)

  
# Register your models here.

