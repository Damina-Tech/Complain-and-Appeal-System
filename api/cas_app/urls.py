from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .api import *
from .views import *

router = DefaultRouter()
router.register(r'users', UserViewSet, basename="user")
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'offices', OfficeViewSet, basename='office')
router.register(r'transfers', TransferViewSet, basename='transfer')
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r"groups", GroupViewSet, basename="group")
router.register(r'reports', ReportsViewSet, basename='reports')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path("", include(router.urls)),
    path('login/', user_login, name='user_login'),
    path('logout/', logout_view, name='logout_view'),
]
