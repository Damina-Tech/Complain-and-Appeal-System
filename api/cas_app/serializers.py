from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", 
            "email", "phone_number", 'national_id', "last_seen", "status",
            "deleted_by", "added_by", "status_changed_by", 
            "created_at", "password"
        ]
        read_only_fields = [
            "last_seen", "deleted_by", "added_by", 
            "status_changed_by", "created_at"
        ]
