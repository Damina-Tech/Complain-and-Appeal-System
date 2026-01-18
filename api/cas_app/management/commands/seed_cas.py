# cas_app/management/commands/seed_cas.py
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from django.utils import timezone

from cas_app.models import (
    Office, Category, Case, CaseStatusHistory, CaseFeedback,
    Transfer, Assignment, RoleHierarchy, Announcement, Notification,
)

User = get_user_model()

# Main roles for the system - Only these 5 roles are allowed
ROLES = [
    "Citizen",
    "Focal Person",
    "Director",
    "Mayor Office",
    "Admin",
]


def _unique_permissions(perms):
    """Return a sorted list of unique permission codenames."""
    return sorted(set(perms))


CITIZEN_PERMISSIONS = _unique_permissions(
    [
        "view_case",
        "add_case",
        "change_case",
        "view_casefeedback",
        "add_casefeedback",
        "view_casestatushistory",
        "view_transfer",
        "view_assignment",
        "view_office",
        "view_announcement",
    ]
)

FOCAL_CORE_PERMISSIONS = _unique_permissions(
    CITIZEN_PERMISSIONS
    + [
        "delete_case",
        "change_casefeedback",
        "delete_casefeedback",
        "add_assignment",
        "change_assignment",
        "delete_assignment",
        "add_transfer",
        "change_transfer",
        "delete_transfer",
        "add_announcement",
        "change_announcement",
    ]
)

MAYOR_OFFICE_PERMISSIONS = _unique_permissions(
    CITIZEN_PERMISSIONS
    + [
        "change_case",
        "view_assignment",
        "view_transfer",
        "change_transfer",
        "view_announcement",
        "change_announcement",
    ]
)

DIRECTOR_PERMISSIONS = _unique_permissions(
    FOCAL_CORE_PERMISSIONS
    + [
        "view_user",
        "add_user",
        "change_user",
        "delete_user",
        "view_group",
        "change_group",
        "view_office",
        "add_office",
        "change_office",
        "delete_office",
        "delete_announcement",
]
)

# Mayor Office permissions are already defined above
# Note: Mayor Office does not have group management permissions

# Admin gets ALL permissions - will be set dynamically in _assign_role_permissions
ADMIN_PERMISSIONS = []  # Placeholder, will be populated with all permissions

ROLE_PERMISSION_MATRIX = {
    "Citizen": CITIZEN_PERMISSIONS,
    "Focal Person": FOCAL_CORE_PERMISSIONS,
    "Director": DIRECTOR_PERMISSIONS,
    "Mayor Office": MAYOR_OFFICE_PERMISSIONS,
    "Admin": ADMIN_PERMISSIONS,  # Will be set to all permissions dynamically
}

PASSWORD = "Passw0rd!"

def uniq(n: int) -> str:
    """Return a zero-padded numeric string for uniqueness."""
    return f"{n:03d}"

class Command(BaseCommand):
    help = "Seed CAS demo data: groups, users, offices, cases, history, feedback, transfers, assignments. Always clears database before seeding."

    @transaction.atomic
    def handle(self, *args, **options):
        # Always clear database before seeding
        self.stdout.write(self.style.WARNING("Clearing existing seed data..."))
        
        # Clear all related data in correct order (respect foreign key constraints)
        Notification.objects.all().delete()
        Assignment.objects.all().delete()
        Transfer.objects.all().delete()
        CaseFeedback.objects.all().delete()
        CaseStatusHistory.objects.all().delete()
        Case.objects.all().delete()
        Announcement.objects.all().delete()
        Category.objects.all().delete()
        Office.objects.all().delete()
        RoleHierarchy.objects.all().delete()
        
        # Remove users that match our seed pattern (avoid deleting real users)
        for u in User.objects.filter(email__endswith="@seed.local"):
            u.delete()
        
        # Remove admin user if it exists
        try:
            admin_user = User.objects.get(username="admin", email="admin@cas.local")
            admin_user.delete()
        except User.DoesNotExist:
            pass
        
        # Delete all groups that are NOT in our allowed roles list
        allowed_role_names = set(ROLES)
        all_groups = Group.objects.all()
        for group in all_groups:
            if group.name not in allowed_role_names:
                self.stdout.write(self.style.WARNING(f"Deleting unauthorized group: {group.name}"))
                group.delete()
        
        self.stdout.write(self.style.SUCCESS("Database cleared successfully."))

        self._ensure_groups()
        self._ensure_role_hierarchy()
        # Ensure admin is created AFTER groups are created
        admin = self._ensure_admin()

        # Seed one user per role (except Admin which is already created)
        users_by_group = self._seed_users_per_group()
        citizens = users_by_group["Citizen"]
        staff_users = [u for g, lst in users_by_group.items() if g != "Citizen" for u in lst]

        # Seed categories (required for cases)
        categories = self._seed_categories(created_by=admin)
        
        # Seed offices
        offices = self._seed_offices()
        
        # Seed cases (with categories)
        cases = self._seed_cases(
            citizens=citizens,
            offices=offices,
            categories=categories,
            added_by=admin
        )
        
        # Seed related data (2 of each)
        self._seed_status_history(cases)
        self._seed_feedback(cases, citizens)
        self._seed_transfers(cases, offices)
        self._seed_assignments(cases, staff_users + [admin])
        self._seed_announcements(admin, staff_users)
        self._seed_notifications(staff_users + citizens + [admin])

        self.stdout.write(self.style.SUCCESS("✅ Seeding complete."))

    # ---------- helpers ----------
    def _ensure_groups(self):
        """Create groups for all roles and assign permissions."""
        groups = {}
        # Create groups for all roles defined in ROLE_PERMISSION_MATRIX
        for name in ROLE_PERMISSION_MATRIX.keys():
            group, created = Group.objects.get_or_create(name=name)
            groups[name] = group
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created group: {name}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Group '{name}' already exists."))
        self.stdout.write(self.style.SUCCESS(f"Groups ensured ({len(groups)} groups)."))
        self._assign_role_permissions(groups)

    def _assign_role_permissions(self, groups: dict):
        """Attach predefined permission sets to each role-based group."""
        # For Admin role, assign ALL permissions
        all_permissions = list(Permission.objects.all())
        admin_group = groups.get("Admin")
        if admin_group:
            admin_group.permissions.set(all_permissions)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Permissions assigned to 'Admin' ({len(all_permissions)} permissions - ALL)."
                )
            )
        
        # For other roles, use predefined permission sets
        all_codes = {
            code for codes in ROLE_PERMISSION_MATRIX.values() 
            for code in codes if codes  # Skip empty Admin list
        }
        perms = Permission.objects.filter(codename__in=all_codes)
        perms_by_code = {perm.codename: perm for perm in perms}

        missing = sorted(all_codes - set(perms_by_code.keys()))
        if missing:
            self.stdout.write(
                self.style.WARNING(
                    f"⚠️  Missing permissions (check model migrations): {', '.join(missing)}"
                )
            )

        for role, codes in ROLE_PERMISSION_MATRIX.items():
            if role == "Admin":
                continue  # Already handled above
            group = groups.get(role) or Group.objects.get(name=role)
            assigned = [perms_by_code[code] for code in codes if code in perms_by_code]
            group.permissions.set(assigned)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Permissions assigned to '{role}' ({len(assigned)} permissions)."
                )
            )

    def _ensure_role_hierarchy(self):
        """Create role hierarchy configuration for dynamic transfer system."""
        # Define hierarchy: Citizen (1) -> Focal Person (2) -> Director (3) -> Mayor Office (4) -> Admin (5)
        hierarchy_config = {
            "Citizen": {
                "level": 1,
                "can_transfer_to": [],  # Citizens cannot transfer
                "can_assign": False,
                "can_change_status": False,
            },
            "Focal Person": {
                "level": 2,
                "can_transfer_to": ["Director"],  # Can transfer to Director
                "can_assign": True,
                "can_change_status": True,
            },
            "Director": {
                "level": 3,
                "can_transfer_to": ["Mayor Office"],  # Can transfer to Mayor Office
                "can_assign": True,
                "can_change_status": True,
            },
            "Mayor Office": {
                "level": 4,
                "can_transfer_to": [],  # Top level, cannot transfer further
                "can_assign": True,
                "can_change_status": True,
            },
            "Admin": {
                "level": 5,
                "can_transfer_to": [],  # Admin can manage everything but doesn't transfer cases
                "can_assign": True,
                "can_change_status": True,
            },
        }

        for role_name, config in hierarchy_config.items():
            try:
                group = Group.objects.get(name=role_name)
            except Group.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Group '{role_name}' not found. Skipping hierarchy setup."))
                continue

            hierarchy, created = RoleHierarchy.objects.get_or_create(
                role=group,
                defaults={
                    "hierarchy_level": config["level"],
                    "can_assign": config["can_assign"],
                    "can_change_status": config["can_change_status"],
                }
            )
            
            if not created:
                # Update existing hierarchy
                hierarchy.hierarchy_level = config["level"]
                hierarchy.can_assign = config["can_assign"]
                hierarchy.can_change_status = config["can_change_status"]
                hierarchy.save()

            # Set transfer targets
            transfer_targets = []
            for target_role_name in config["can_transfer_to"]:
                try:
                    target_group = Group.objects.get(name=target_role_name)
                    transfer_targets.append(target_group)
                except Group.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f"Target role '{target_role_name}' not found."))
            
            hierarchy.can_transfer_to.set(transfer_targets)
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created hierarchy for '{role_name}' (Level {config['level']})"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated hierarchy for '{role_name}' (Level {config['level']})"))

    def _ensure_admin(self):
        """Create superuser with Admin role."""
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
                "is_superuser": True,  # Superuser as requested
            },
        )
        if created:
            admin.set_password(PASSWORD)
            admin.save()
            self.stdout.write(self.style.SUCCESS(f"Admin superuser created (admin@cas.local / {PASSWORD})"))
        else:
            # Update password and ensure superuser status if user exists
            admin.set_password(PASSWORD)
            admin.is_staff = True
            admin.is_superuser = True
            admin.email = admin_email  # Ensure unique email
            admin.save()
            self.stdout.write(self.style.SUCCESS(f"Admin superuser updated (admin@cas.local / {PASSWORD})"))
        
        # Always assign Admin group (even if user already exists)
        try:
            admin_group = Group.objects.get(name="Admin")
            admin.groups.clear()
            admin.groups.add(admin_group)
            self.stdout.write(self.style.SUCCESS("Admin group assigned to admin user."))
        except Group.DoesNotExist:
            self.stdout.write(self.style.WARNING("Admin group not found. Run _ensure_groups first."))
        
        return admin

    def _seed_users_per_group(self):
        """
        Create 1 user per role (Citizen, Focal Person, Director, Mayor Office).
        Admin user is created separately in _ensure_admin.
        Each user gets assigned to their role's group with appropriate permissions.
        """
        users_by_group = {}

        # Seed one user for each role in ROLE_PERMISSION_MATRIX (except Admin)
        for idx, role in enumerate(ROLE_PERMISSION_MATRIX.keys(), start=1):
            if role == "Admin":
                continue  # Admin user is created separately in _ensure_admin
            try:
                grp = Group.objects.get(name=role)
            except Group.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Group '{role}' not found. Skipping user creation."))
                continue

            # Generate unique username and email
            role_prefix = role.replace(" ", "").replace("-", "").lower()
            username = f"{role_prefix}_user"
            email = f"{username}@seed.local"
            
            # Ensure unique email by appending index if needed
            counter = 1
            while User.objects.filter(email=email).exists():
                email = f"{username}{counter}@seed.local"
                counter += 1
            
            # National ID with role abbreviation
            role_abbr = "".join([w[0] for w in role.split()[:2]]).upper()[:3]
            nat_id = f"ID-{idx:03d}-{role_abbr}"
            phone = f"+2519{random.randint(10,99)}{random.randint(1000000,9999999)}"

            user, created = User.objects.get_or_create(
                email=email,  # Use email as unique identifier
                defaults={
                    "username": username if not User.objects.filter(username=username).exists() else f"{username}_{counter}",
                    "first_name": role.split()[0],
                    "last_name": "User",
                    "national_id": nat_id,
                    "phone_number": phone,
                    "status": "active",
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"  Created user: {user.username} ({role}) - {email}"))
            else:
                # Update username if needed
                if not user.username or User.objects.filter(username=username).exclude(pk=user.pk).exists():
                    user.username = f"{username}_{user.id}"
                user.set_password(PASSWORD)
                user.save()
                self.stdout.write(self.style.WARNING(f"  User {user.username} already exists, updating group membership."))
            
            # Ensure group membership (users inherit permissions from their group)
            user.groups.set([grp])
            users_by_group[role] = [user]
            self.stdout.write(self.style.SUCCESS(f"✓ Seeded 1 user for '{role}' role."))

        total_users = sum(len(users) for users in users_by_group.values())
        self.stdout.write(self.style.SUCCESS(f"✅ Total users seeded: {total_users} across {len(users_by_group)} roles."))
        return users_by_group

    def _seed_categories(self, created_by):
        """Create 2 sample categories for cases."""
        categories_data = [
            {"name": "Complaint", "description": "General complaint category"},
            {"name": "Appeal", "description": "Appeal request category"},
        ]
        categories = []
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data["name"],
                defaults={
                    "description": cat_data["description"],
                    "is_active": True,
                    "created_by": created_by,
                }
            )
            categories.append(category)
        self.stdout.write(self.style.SUCCESS("2 Categories seeded."))
        return categories

    def _seed_offices(self):
        """Create 2 sample offices."""
        names = [
            "Directorate Office",
            "Mayor Office",
        ]
        offices = []
        for name in names:
            office, _ = Office.objects.get_or_create(name=name)
            offices.append(office)
        self.stdout.write(self.style.SUCCESS("2 Offices seeded."))
        return offices

    def _seed_cases(self, citizens, offices, categories, added_by):
        """
        Create 2 sample cases using citizens, offices, and categories.
        """
        cases_data = [
            {
                "title": "Service Delay Complaint",
                "description": "Citizen reported a delay in service delivery that needs urgent attention.",
                "category": categories[0] if len(categories) > 0 else None,
                "channel": "web",
                "priority": "high",
                "status": "pending",
            },
            {
                "title": "Permit Appeal Request",
                "description": "Citizen requesting appeal for a previously rejected permit application.",
                "category": categories[1] if len(categories) > 1 else categories[0] if len(categories) > 0 else None,
                "channel": "walk_in",
                "priority": "medium",
                "status": "in_investigation",
            },
        ]

        cases = []
        now = timezone.now()
        for idx, case_data in enumerate(cases_data):
            citizen = citizens[idx % len(citizens)] if citizens else None
            office = offices[idx % len(offices)] if offices else None
            
            if not citizen:
                self.stdout.write(self.style.WARNING("No citizens available for case creation. Skipping."))
                continue

            case = Case.objects.create(
                citizen_id=citizen,
                office_id=office,
                title=case_data["title"],
                description=case_data["description"],
                category_id=case_data["category"],
                channel=case_data["channel"],
                priority=case_data["priority"],
                status=case_data["status"],
                added_by=added_by,
                created_at=now - timedelta(days=idx),
            )
            cases.append(case)

        self.stdout.write(self.style.SUCCESS(f"{len(cases)} Cases seeded."))
        return cases

    def _seed_status_history(self, cases):
        """
        Create status history entries for cases (2 total).
        """
        if not cases:
            return
        
        # Create status history for first 2 cases
        for case in cases[:2]:
            CaseStatusHistory.objects.create(
                case=case,
                status=case.status,
                changed_by=case.added_by,
            )
        self.stdout.write(self.style.SUCCESS("Case status history seeded."))

    def _seed_feedback(self, cases, citizens):
        """
        Create 2 feedback items. Ensure the target case is closed; if not, set to closed first.
        """
        if not cases:
            return
        
        # Create feedback for first 2 cases (or as many as available)
        targets = cases[:2]
        for case in targets:
            if case.status != "closed":
                case.status = "closed"
                case.save(update_fields=["status"])
                CaseStatusHistory.objects.create(case=case, status="closed", changed_by=case.added_by)

            owner = case.citizen_id
            rating = random.randint(3, 5)
            comment = random.choice([
                "Satisfied with the resolution.",
                "Thanks for the prompt response.",
            ])
            # unique (case, created_by)
            CaseFeedback.objects.get_or_create(
                case=case,
                created_by=owner,
                defaults={"rating": rating, "comment": comment},
            )
        self.stdout.write(self.style.SUCCESS("2 Feedbacks seeded."))

    def _seed_transfers(self, cases, offices):
        """
        Create 2 transfers, updating the case office to the new office.
        """
        if not cases or len(offices) < 2:
            return
        
        # Create transfers for first 2 cases
        for idx, case in enumerate(cases[:2]):
            from_office = case.office_id or offices[0]
            # Select a different office for transfer
            to_office = offices[1] if from_office == offices[0] else offices[0]
            
            reason = random.choice([
                "Escalation to next level",
                "Re-routing to appropriate office",
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
        self.stdout.write(self.style.SUCCESS("2 Transfers seeded."))

    def _seed_assignments(self, cases, staff_users):
        """
        Create 2 assignments between staff users.
        """
        if not cases:
            return
        
        pool = [u for u in staff_users if u]  # Filter out None
        if len(pool) < 2:
            self.stdout.write(self.style.WARNING("Not enough staff users to create assignments. Skipping."))
            return

        # Create assignments for first 2 cases
        for idx, case in enumerate(cases[:2]):
            if len(pool) >= 2:
                from_user = pool[idx % len(pool)]
                to_user = pool[(idx + 1) % len(pool)]
                if from_user == to_user and len(pool) > 2:
                    to_user = pool[(idx + 2) % len(pool)]
            else:
                continue
                
            reason = random.choice([
                "Workload balancing",
                "Subject matter expertise",
            ])
            Assignment.objects.create(
                case_id=case,
                from_user_id=from_user,
                to_user_id=to_user,
                reason=reason,
            )
        self.stdout.write(self.style.SUCCESS("2 Assignments seeded."))
    
    def _seed_announcements(self, created_by, staff_users):
        """Create 2 sample announcements."""
        announcements_data = [
            {
                "title": "System Maintenance Notice",
                "content": "The system will undergo scheduled maintenance this weekend.",
                "delivery_modes": ["in_app", "email"],
            },
            {
                "title": "New Feature Announcement",
                "content": "We are pleased to announce new features for case management.",
                "delivery_modes": ["in_app"],
            },
        ]
        
        if not staff_users:
            return
        
        admin_group = Group.objects.filter(name="Admin").first()
        director_group = Group.objects.filter(name="Director").first()
        
        for ann_data in announcements_data:
            announcement = Announcement.objects.create(
                title=ann_data["title"],
                content=ann_data["content"],
                delivery_modes=ann_data["delivery_modes"],
                is_active=True,
                created_by=created_by,
                updated_by=created_by,
            )
            # Assign to Admin and Director groups
            if admin_group:
                announcement.recipients_groups.add(admin_group)
            if director_group:
                announcement.recipients_groups.add(director_group)
        
        self.stdout.write(self.style.SUCCESS("2 Announcements seeded."))
    
    def _seed_notifications(self, users):
        """Create 2 sample notifications."""
        if not users:
            return
        
        notification_data = [
            {
                "notification_type": "case_assigned",
                "title": "New Case Assigned",
                "message": "A new case has been assigned to you for review.",
            },
            {
                "notification_type": "case_status",
                "title": "Case Status Updated",
                "message": "The status of one of your cases has been updated.",
            },
        ]
        
        # Assign notifications to first 2 users (or as many as available)
        target_users = users[:2]
        for idx, user in enumerate(target_users):
            if idx < len(notification_data):
                Notification.objects.create(
                    user=user,
                    notification_type=notification_data[idx]["notification_type"],
                    title=notification_data[idx]["title"],
                    message=notification_data[idx]["message"],
                    is_read=False,
                )
        
        self.stdout.write(self.style.SUCCESS("2 Notifications seeded."))
