#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  umask 077
  {
    printf 'DJANGO_SECRET_KEY=%s\n' "$(openssl rand -hex 48)"
    printf 'ADMIN_EMAIL=admin@chiro.gov.et\n'
    printf 'ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  } > .env
fi
if [ "${DEPLOY_DOMAINS:-1}" = 1 ]; then export CAS_DATA_DIR=/srv/cas; else export CAS_DATA_DIR="$PWD/.docker-data"; fi
mkdir -p "$CAS_DATA_DIR/data" "$CAS_DATA_DIR/media" "$CAS_DATA_DIR/backups"
export CAS_DATA_DIR
python3 - <<'PY'
import os, sqlite3, pathlib, shutil, datetime
root = pathlib.Path(os.environ['CAS_DATA_DIR'])
target = root / 'data/db.sqlite3'
if not target.exists() and pathlib.Path('api/db.sqlite3').exists():
    with sqlite3.connect('file:api/db.sqlite3?mode=ro', uri=True) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    if pathlib.Path('api/media').exists():
        shutil.copytree('api/media', root / 'media', dirs_exist_ok=True)
    print('Existing CAS database and uploads preserved.')
if target.exists():
    backup = root / 'backups' / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.sqlite3')
    with sqlite3.connect(target) as src, sqlite3.connect(backup) as dst:
        src.backup(dst)
    print('Database backup created before migrations.')
PY
if [ "$(id -u)" = 0 ]; then
  chown -R 10001:10001 "$CAS_DATA_DIR/data" "$CAS_DATA_DIR/media"
else
  sudo chown -R 10001:10001 "$CAS_DATA_DIR/data" "$CAS_DATA_DIR/media"
fi
compose() {
  if [ "${DEPLOY_DOMAINS:-1}" = 1 ]; then
    docker compose --env-file .env -f docker-compose.yml -f docker-compose.domains.yml "$@"
  else docker compose --env-file .env "$@"; fi
}
trap 'compose ps; compose logs --tail 60 cas-api cas-web' ERR
compose config --quiet
if [ "${SKIP_BUILD:-0}" != 1 ]; then compose build --pull; fi
compose run --rm --no-deps cas-api python manage.py check
compose run --rm --no-deps cas-api python manage.py migrate --noinput
compose run --rm --no-deps cas-api python manage.py bootstrap_admin
compose up -d --wait --wait-timeout 240 --remove-orphans
if [ "${DEPLOY_DOMAINS:-1}" = 1 ]; then bash deploy/configure-domains.sh; fi
compose ps
