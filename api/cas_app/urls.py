from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .api import *
from .views import *


router = DefaultRouter()
router.register(r'users', UserViewSet, basename="user")
router.register(r'cases', CaseViewSet, basename='cases')
router.register(r'offices', OfficeViewSet, basename='offices')

urlpatterns = [
    path("", include(router.urls)),
    path('login/', user_login, name='user_login'),
    path('logout/', logout_view, name='logout_view'),
]
