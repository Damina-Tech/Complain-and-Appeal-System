from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers
from .models import *
from django.contrib.auth.models import Group, Permission

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
    added_by = serializers.StringRelatedField(read_only=True)
    updated_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Office
        fields = [
            "id", "name", "phone_number", "email", "address",
            "is_active", "created_at", "updated_at",
            "added_by", "updated_by"
        ]
        read_only_fields = ["id", "created_at", "updated_at", "added_by", "updated_by"]

class CaseStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = CaseStatusHistory
        fields = ["id", "status", "changed_at", "changed_by"]

class CaseFeedbackSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CaseFeedback
        fields = ["id", "case", "created_by", "rating", "comment", "created_at"]
        read_only_fields = ["id", "created_by", "created_at", "case"]

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
    
class CaseSerializer(serializers.ModelSerializer):
    # Just declare PK fields without `source=...`
    citizen_id   = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    office_id    = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), required=False, allow_null=True)
    parent_case  = serializers.PrimaryKeyRelatedField(queryset=Case.objects.all(), required=False, allow_null=True)

    status_history = CaseStatusHistorySerializer(many=True, read_only=True)
    feedbacks      = CaseFeedbackSerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "citizen_id",
            "office_id",
            "parent_case",
            "title",
            "description",
            "attachments",
            "category_id",
            "channel",
            "priority",
            "status",
            "created_at",
            "added_by",
            "status_changed_by",
            "deleted_by",
            "last_seen_by",
            "status_history",
            "feedbacks",
        ]
        read_only_fields = [
            "created_at",
            "added_by",
            "status_changed_by",
            "deleted_by",
            "last_seen_by",
        ]


class TransferSerializer(serializers.ModelSerializer):
    # keep *_id naming per your style
    case_id = serializers.PrimaryKeyRelatedField(queryset=Case.objects.filter(deleted_by__isnull=True))
    from_office_id = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all())
    to_office_id = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all())

    class Meta:
        model = Transfer
        fields = ["id", "case_id", "from_office_id", "to_office_id", "reason", "timestamp"]
        read_only_fields = ["timestamp"]

    def validate(self, attrs):
        case = attrs["case_id"]
        from_office = attrs["from_office_id"]
        to_office = attrs["to_office_id"]

        if from_office == to_office:
            raise serializers.ValidationError("from_office_id and to_office_id cannot be the same.")

        # sanity: current office should match from_office to avoid race/incorrect transfer
        if case.office_id and case.office_id_id != from_office.id:
            raise serializers.ValidationError("Case current office does not match from_office_id.")
        return attrs


class AssignmentSerializer(serializers.ModelSerializer):
    case_id = serializers.PrimaryKeyRelatedField(queryset=Case.objects.filter(deleted_by__isnull=True))
    from_user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    to_user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Assignment
        fields = ["id", "case_id", "from_user_id", "to_user_id", "reason", "timestamp"]
        read_only_fields = ["timestamp"]

    def validate(self, attrs):
        from_user = attrs.get("from_user_id")
        to_user = attrs["to_user_id"]
        if from_user and from_user == to_user:
            raise serializers.ValidationError("from_user_id and to_user_id cannot be the same.")
        return attrs
    

class GroupSerializer(serializers.ModelSerializer):
    # Write by permission IDs; read returns both IDs and codenames
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), required=False
    )
    permission_codenames = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="codename", source="permissions"
    )

    class Meta:
        model = Group
        fields = ["id", "name", "permissions", "permission_codenames"]

    def validate_name(self, value):
        qs = Group.objects.exclude(pk=self.instance.pk) if self.instance else Group.objects.all()
        if qs.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A group with this name already exists.")
        return value

class AnnouncementSerializer(serializers.ModelSerializer):
    recipients_groups = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Group.objects.all()
    )
    recipients_offices = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Office.objects.all()
    )

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "content", "is_active",
            "recipients_groups", "recipients_offices",
            "created_at", "updated_at", "created_by", "updated_by",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by", "updated_by"]