from django.db import migrations, models
class Migration(migrations.Migration):
    dependencies = [("cas_app", "0002_workflow_schema")]
    operations = [
        migrations.AddField(model_name="user", name="keycloak_sub", field=models.CharField(blank=True, max_length=255, null=True, unique=True)),
        migrations.AddField(model_name="user", name="keycloak_issuer", field=models.CharField(blank=True, max_length=500, null=True)),
    ]
