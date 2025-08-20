# cas_app/management/commands/seed_cas.py
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from django.utils import timezone

from cas_app.models import (
    Office, Case, CaseStatusHistory, CaseFeedback,
    Transfer, Assignment,
)

User = get_user_model()

ROLES = [
    "Citizen",
    "Focal Person - Kebele",
    "Focal Person - Wereda",
    "Focal Person - Sector",
    "Director",
    "President Office",
    "President",
]

PASSWORD = "Passw0rd!"

def uniq(n: int) -> str:
    """Return a zero-padded numeric string for uniqueness."""
    return f"{n:03d}"

class Command(BaseCommand):
    help = "Seed CAS demo data: groups, users, offices, cases, history, feedback, transfers, assignments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Delete existing seeded data before seeding again.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        fresh = options.get("fresh", False)

        if fresh:
            self.stdout.write(self.style.WARNING("Deleting existing seed data..."))
            Assignment.objects.all().delete()
            Transfer.objects.all().delete()
            CaseFeedback.objects.all().delete()
            CaseStatusHistory.objects.all().delete()
            Case.objects.all().delete()
            Office.objects.all().delete()
            # Remove users that match our seed pattern (avoid deleting real users)
            for u in User.objects.filter(email__endswith="@seed.local"):
                u.delete()
            # groups we recreate below (not deleting to avoid messing with real perms)

        self._ensure_groups()
        admin = self._ensure_admin()

        users_by_group = self._seed_users_per_group()
        citizens = users_by_group["Citizen"]
        staff_users = [u for g, lst in users_by_group.items() if g != "Citizen" for u in lst]

        offices = self._seed_offices()
        cases = self._seed_cases(citizens=citizens, offices=offices, added_by=admin or random.choice(staff_users or citizens))
        self._seed_status_history(cases)
        self._seed_feedback(cases, citizens)
        self._seed_transfers(cases, offices)
        self._seed_assignments(cases, staff_users or citizens)

        self.stdout.write(self.style.SUCCESS("✅ Seeding complete."))

    # ---------- helpers ----------
    def _ensure_groups(self):
        for name in ROLES:
            Group.objects.get_or_create(name=name)
        self.stdout.write(self.style.SUCCESS("Groups ensured."))

    def _ensure_admin(self):
        admin_email = "admin@cas.local"
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": admin_email,
                "first_name": "System",
                "last_name": "Admin",
                "national_id": "99-ADMIN-000",
                "phone_number": "+251900000000",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password(PASSWORD)
            admin.save()
            self.stdout.write(self.style.SUCCESS("Superuser created (admin@cas.local / Passw0rd!)"))
        else:
            self.stdout.write(self.style.SUCCESS("Superuser already exists."))
        return admin

    def _seed_users_per_group(self):
        """
        Create 7 users per role (49 total), attach each to its Group.
        Citizen users will be used as 'citizens' for cases.
        """
        users_by_group = {}
        base_counter = 1

        for role in ROLES:
            grp = Group.objects.get(name=role)
            bucket = []
            for i in range(1, 8):  # 1..7
                suffix = uniq(base_counter)
                username = f"{role.split()[0].lower()}_{suffix}".replace("-", "").replace("/", "")
                email = f"{username}@seed.local"
                nat_id = f"ID-{suffix}-{role[:3].upper()}"
                phone = f"+2519{random.randint(10,99)}{random.randint(1000000,9999999)}"

                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "email": email,
                        "first_name": role.split()[0],
                        "last_name": f"User{suffix}",
                        "national_id": nat_id,
                        "phone_number": phone,
                        "status": "active",
                    },
                )
                if created:
                    user.set_password(PASSWORD)
                    user.save()
                # ensure group membership (single-group simple model)
                user.groups.set([grp])
                bucket.append(user)
                base_counter += 1
            users_by_group[role] = bucket

        self.stdout.write(self.style.SUCCESS("Users seeded per group (7 each)."))
        return users_by_group

    def _seed_offices(self):
        names = [
            "Kebele Office A",
            "Kebele Office B",
            "Wereda Office A",
            "Wereda Office B",
            "Sector Office A",
            "Directorate Office",
            "President Office",
        ]
        offices = []
        for name in names:
            office, _ = Office.objects.get_or_create(name=name)
            offices.append(office)
        self.stdout.write(self.style.SUCCESS("7 Offices seeded."))
        return offices

    def _seed_cases(self, citizens, offices, added_by):
        """
        Create 7 cases using random citizens and offices.
        Mix of statuses and priorities.
        """
        titles = [
            "Service Delay Complaint",
            "Water Supply Issue",
            "ID Processing Complaint",
            "Tax Clarification Request",
            "Permit Appeal",
            "Road Maintenance Complaint",
            "Administrative Decision Appeal",
        ]
        descriptions = [
            "Detail about the reported issue with relevant references.",
            "Citizen reported recurring problem affecting services.",
            "Follow-up needed with respective office focal person.",
            "Citizen requests clarification and faster resolution.",
            "Escalated to upper office for review and action.",
            "On-site assessment might be required.",
            "Subject to leadership final review.",
        ]
        categories = ["complaint", "appeal", "other"]
        channels = ["web", "walk_in", "phone"]
        priorities = ["low", "medium", "high", "urgent"]
        statuses = ["pending", "investigation", "resolved", "rejected", "closed"]

        cases = []
        now = timezone.now()
        for idx in range(7):
            citizen = random.choice(citizens)
            office = random.choice(offices)
            title = titles[idx]
            desc = descriptions[idx]
            category_id = random.choice(categories)
            channel = random.choice(channels)
            priority = random.choice(priorities)
            status = random.choice(statuses)

            case = Case.objects.create(
                citizen_id=citizen,
                office_id=office,
                title=title,
                description=desc,
                category_id=category_id,
                channel=channel,
                priority=priority,
                status=status,
                added_by=added_by,
                created_at=now - timedelta(days=random.randint(0, 20)),
            )
            cases.append(case)

        self.stdout.write(self.style.SUCCESS("7 Cases seeded."))
        return cases

    def _seed_status_history(self, cases):
        """
        Create at least one status history row per case (current status).
        """
        for case in cases:
            CaseStatusHistory.objects.create(
                case=case,
                status=case.status,
                changed_by=case.added_by,
            )
        self.stdout.write(self.style.SUCCESS("Case status history seeded."))

    def _seed_feedback(self, cases, citizens):
        """
        Create 7 feedback items. Ensure the target case is closed; if not, set to closed first.
        """
        targets = random.sample(cases, k=min(7, len(cases)))
        for case in targets:
            if case.status != "closed":
                case.status = "closed"
                case.save(update_fields=["status"])
                CaseStatusHistory.objects.create(case=case, status="closed", changed_by=case.added_by)

            owner = case.citizen_id
            rating = random.randint(3, 5)
            comment = random.choice([
                "Satisfied with the resolution.",
                "Resolution acceptable.",
                "Thanks for the prompt response.",
                "Communication could be better, but resolved.",
                "Appreciate the support.",
            ])
            # unique (case, created_by)
            CaseFeedback.objects.get_or_create(
                case=case,
                created_by=owner,
                defaults={"rating": rating, "comment": comment},
            )
        self.stdout.write(self.style.SUCCESS("7 Feedbacks seeded."))

    def _seed_transfers(self, cases, offices):
        """
        Create 7 transfers, updating the case office to the new office.
        """
        for _ in range(7):
            case = random.choice(cases)
            from_office = case.office_id or random.choice(offices)
            to_office = random.choice([o for o in offices if o.id != from_office.id])
            reason = random.choice([
                "Escalation to next level",
                "Re-routing to appropriate office",
                "Workload balancing",
                "Specialized handling required",
                "Jurisdiction change",
            ])
            transfer = Transfer.objects.create(
                case_id=case,
                from_office_id=from_office,
                to_office_id=to_office,
                reason=reason,
            )
            # reflect move on case
            case.office_id = to_office
            case.status_changed_by = case.added_by
            case.save(update_fields=["office_id", "status_changed_by"])
        self.stdout.write(self.style.SUCCESS("7 Transfers seeded."))

    def _seed_assignments(self, cases, staff_users):
        """
        Create 7 assignments between staff users.
        If staff list is empty, fall back to any users.
        """
        pool = staff_users or list(User.objects.all())
        if len(pool) < 2:
            self.stdout.write(self.style.WARNING("Not enough staff users to create assignments. Skipping."))
            return

        for _ in range(7):
            case = random.choice(cases)
            from_user, to_user = random.sample(pool, 2)
            reason = random.choice([
                "Workload balancing",
                "Subject matter expertise",
                "Schedule constraints",
                "Follow-up required",
                "Internal re-assignment",
            ])
            Assignment.objects.create(
                case_id=case,
                from_user_id=from_user,
                to_user_id=to_user,
                reason=reason,
            )
        self.stdout.write(self.style.SUCCESS("7 Assignments seeded."))
