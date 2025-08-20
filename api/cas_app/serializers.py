from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers
from .models import *

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    groups = serializers.SlugRelatedField(
        many=True,
        slug_field="name",
        queryset=Group.objects.all(),
        required=False
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", 
            "email", "phone_number", "national_id",
            "last_seen", "status",
            "deleted_by", "added_by", "status_changed_by", 
            "created_at", "password", "groups"
        ]
        read_only_fields = [
            "last_seen", "deleted_by", "added_by", 
            "status_changed_by", "created_at"
        ]

    def create(self, validated_data):
        groups = validated_data.pop("groups", None)
        user = User.objects.create_user(**validated_data)

        if groups:
            user.groups.set(groups)  # internal user creation with role
        else:
            citizen_group, _ = Group.objects.get_or_create(name="Citizen")
            user.groups.add(citizen_group)  # default external role

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        groups = validated_data.pop("groups", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        if groups is not None:
            instance.groups.set(groups)

        return instance

class OfficeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Office
        fields = ["id", "name"]


class CaseStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = CaseStatusHistory
        fields = ["id", "status", "changed_at", "changed_by"]


class CaseSerializer(serializers.ModelSerializer):
    # map *_id fields to actual FKs while keeping your requested names
    citizen_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source="citizen_id")
    office_id  = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), source="office_id", required=False, allow_null=True)

    status_history = CaseStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "citizen_id",
            "office_id",
            "category_id",   # string choice: complaint|appeal|other
            "channel",       # web|walk_in|phone
            "priority",      # low|medium|high|urgent
            "status",        # pending|investigation|resolved|rejected|closed
            "created_at",
            "added_by",
            "status_changed_by",
            "deleted_by",
            "last_seen_by",
            "status_history",
        ]
        read_only_fields = [
            "created_at",
            "added_by",
            "status_changed_by",
            "deleted_by",
            "last_seen_by",
        ]
