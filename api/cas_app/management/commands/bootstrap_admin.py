import os
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from cas_app.models import RoleHierarchy
from cas_app.management.commands.seed_cas import ROLE_PERMISSION_MATRIX

class Command(BaseCommand):
    help = 'Create missing roles and initial admin without demo data or password resets.'
    def handle(self, *args, **kwargs):
        for name in ROLE_PERMISSION_MATRIX:
            group, created = Group.objects.get_or_create(name=name)
            if created:
                permissions = Permission.objects.all() if name == 'Admin' else Permission.objects.filter(codename__in=ROLE_PERMISSION_MATRIX[name])
                group.permissions.set(permissions)
        for level, name in enumerate(['Citizen', 'Focal Person', 'Director', 'Mayor Office', 'Admin'], 1):
            group, created = Group.objects.get_or_create(name=name)
            hierarchy, created = RoleHierarchy.objects.get_or_create(role=group, defaults={'hierarchy_level': level, 'can_assign': level > 1, 'can_change_status': level > 1})
            if created and name in ['Focal Person', 'Director']:
                target = 'Director' if name == 'Focal Person' else 'Mayor Office'
                target_group, _ = Group.objects.get_or_create(name=target)
                hierarchy.can_transfer_to.add(target_group)
        User = get_user_model()
        if User.objects.filter(groups__name='Admin', is_active=True).exists() or User.objects.filter(is_superuser=True, is_active=True).exists():
            self.stdout.write('Existing administrator retained; password unchanged.')
            return
        email, password = os.environ.get('ADMIN_EMAIL'), os.environ.get('ADMIN_PASSWORD')
        if not email or not password or len(password) < 16:
            raise CommandError('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters).')
        user = User.objects.create_user(username=email, email=email, password=password, is_staff=True, is_superuser=True)
        user.groups.add(Group.objects.get(name='Admin'))
        self.stdout.write('Initial administrator created.')
