from django.contrib.auth.models import Group

roles = [
    "Citizen",
    "Focal Person - Kebele",
    "Focal Person - Wereda",
    "Focal Person - Sector",
    "Director",
    "President Office",
    "President",
]

for role in roles:
    Group.objects.get_or_create(name=role)
