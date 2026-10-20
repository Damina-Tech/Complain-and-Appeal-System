import os, sqlite3, subprocess, sys, tempfile
from pathlib import Path
from contextlib import contextmanager

@contextmanager
def database_connection(path):
    connection = sqlite3.connect(path)
    try:
        with connection: yield connection
    finally: connection.close()
root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as temporary:
    database = Path(temporary) / 'upgrade.sqlite3'
    env = {**os.environ, 'DATABASE_PATH': str(database), 'AUTH_MODE': 'local'}
    def manage(*args): subprocess.run([sys.executable, str(root/'manage.py'), *args], env=env, check=True)
    manage('migrate', 'cas_app', '0002_workflow_schema', '--noinput')
    # This is exactly the migration history observed on the VPS: the replacement record is absent.
    with database_connection(database) as db:
        db.execute("DELETE FROM django_migrations WHERE app='cas_app' AND name='0002_workflow_schema'")
        for name in ['0002_rolehierarchy','0003_case_reported_by','0004_notification','0005_user_profile_image_and_more']:
            db.execute("INSERT INTO django_migrations(app,name,applied) VALUES('cas_app',?,CURRENT_TIMESTAMP)", (name,))
    with database_connection(database) as db:
        db.execute("INSERT INTO cas_app_user(password,is_superuser,username,first_name,last_name,email,is_staff,is_active,date_joined,last_seen,status,is_deleted,created_at) VALUES('!',0,'retained','','','retained@example.com',0,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'active',0,CURRENT_TIMESTAMP)")
        retained_id = db.execute("SELECT id FROM cas_app_user WHERE username='retained'").fetchone()[0]
    manage('migrate', '--noinput')
    with database_connection(database) as db:
        assert db.execute("SELECT id FROM cas_app_user WHERE username='retained'").fetchone()[0] == retained_id
        columns = [row[1] for row in db.execute('PRAGMA table_info(cas_app_user)')]
        assert 'keycloak_sub' in columns and 'keycloak_issuer' in columns
        assert db.execute("SELECT COUNT(*) FROM django_migrations WHERE app='cas_app' AND name='0006_chiro_identity'").fetchone()[0] == 1
    print('Historical CAS database upgrade passed; existing user ID retained.')
