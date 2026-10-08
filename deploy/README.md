# CAS deployment
Frontend: https://cas.chirocity.gov.et
API: https://cas-api.chirocity.gov.et/api
Health: https://cas-api.chirocity.gov.et/api/health/

Push main or run Deploy Complain-and-Appeal-System to VPS in GitHub Actions.
Required secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY.
Optional VPS_PORT, VPS_APP_DIR (default /var/www/Complain-and-Appeal-System), VPS_SSH_FINGERPRINT.
Images are built and verified in GitHub Actions and transferred through /tmp.

The existing SQLite database and uploads are copied once into /srv/cas/data and
/srv/cas/media. Existing users and passwords are retained. Database backups are
stored in /srv/cas/backups before migrations. Demo seeds are never run.
A random initial admin is created only when no administrator already exists.
Editing ADMIN_PASSWORD in .env does not reset existing accounts.

Manual deployment:
```bash
cd /var/www/Complain-and-Appeal-System
bash deploy/deploy.sh
```
Apply environment changes without rebuilding:
```bash
CAS_DATA_DIR=/srv/cas docker compose --env-file .env -f docker-compose.yml -f docker-compose.domains.yml up -d --force-recreate --wait
```
Reset an existing user's password interactively:
```bash
CAS_DATA_DIR=/srv/cas docker compose exec cas-api python manage.py changepassword USERNAME
```
Use both production Compose files to retain access to the shared HRMS proxy.
The API is Gunicorn/Django, frontend Next.js standalone, media served by cas-files.
Certificate renewal runs twice daily via /etc/cron.d/cas-cert-renewal.
SMTP is optional and configured through root .env; password reset emails require SMTP.
