import os
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

class Command(BaseCommand):
    help = "Link an existing CAS account to an independently verified Chiro Auth subject."
    def handle(self, *args, **kwargs):
        email, subject = os.environ.get('LINK_EMAIL'), os.environ.get('KEYCLOAK_SUB')
        if not email or not subject: raise CommandError('Provide LINK_EMAIL and KEYCLOAK_SUB.')
        issuer = settings.KEYCLOAK_URL + '/realms/' + settings.KEYCLOAK_REALM
        User = get_user_model()
        with transaction.atomic():
            matches = User.objects.select_for_update().filter(email__iexact=email)
            if matches.count() > 1: raise CommandError('Multiple CAS accounts use this email. Resolve the ambiguity before linking.')
            user = matches.first()
            if not user:
                self.stdout.write('No existing CAS account has this email. A profile will be provisioned on the first authorized Chiro Auth login.')
                return
            if user.keycloak_sub:
                if user.keycloak_sub == subject and user.keycloak_issuer == issuer:
                    self.stdout.write('This CAS user is already linked.'); return
                raise CommandError('This CAS user is linked to another identity. No changes made.')
            if User.objects.filter(keycloak_sub=subject).exists(): raise CommandError('This Chiro Auth identity is already linked to another CAS user.')
            user.keycloak_sub, user.keycloak_issuer = subject, issuer
            user.save(update_fields=['keycloak_sub', 'keycloak_issuer'])
            self.stdout.write('CAS account linked. Existing user ID, cases, office assignments and history preserved.')
