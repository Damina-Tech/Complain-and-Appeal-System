from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .api import UserViewSet
from .views import *


router = DefaultRouter()
router.register(r'users', UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path('login/', user_login, name='user_login'),
    path('logout/', logout_view, name='logout_view'),
]
