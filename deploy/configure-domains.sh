#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."

# This VPS already has a shared Docker proxy and certificate store.
PROXY=hrms-proxy-1
CERTBOT=hrms-certbot-1
PROXY_CONFIG=/var/www/HRMS/deploy/nginx.conf
CERT_STORE=/var/www/HRMS/deploy/certbot/conf
mkdir -p "$CERT_STORE/chirocity-sites"
DOMAIN_CONFIG="$CERT_STORE/chirocity-sites/cas.conf"
INCLUDE='include /etc/letsencrypt/chirocity-sites/*.conf;'
docker inspect "$PROXY" "$CERTBOT" >/dev/null
docker network inspect chirocity_edge >/dev/null
test -f "$PROXY_CONFIG"
test -d "$CERT_STORE"

# Back up and retain the inode of the existing single-file bind mount.
backup_dir="$(mktemp -d)"
cp -p "$PROXY_CONFIG" "$backup_dir/proxy.conf"
had_domain_config=0
if [ -f "$DOMAIN_CONFIG" ]; then
  had_domain_config=1
  cp -p "$DOMAIN_CONFIG" "$backup_dir/cas.conf"
fi
restore_proxy() {
  cat "$backup_dir/proxy.conf" > "$PROXY_CONFIG"
  if [ "$had_domain_config" = 1 ]; then
    cat "$backup_dir/cas.conf" > "$DOMAIN_CONFIG"
  else
    rm -f "$DOMAIN_CONFIG"
  fi
  docker exec "$PROXY" nginx -t && docker exec "$PROXY" nginx -s reload || true
}
trap restore_proxy ERR
trap 'rm -rf "$backup_dir"' EXIT

cat deploy/cas-http.conf > "$DOMAIN_CONFIG"
if [ -f "$CERT_STORE/live/cas.chirocity.gov.et/fullchain.pem" ]; then
  cat deploy/cas-https.conf >> "$DOMAIN_CONFIG"
fi
if ! grep -qFx "$INCLUDE" "$PROXY_CONFIG"; then
  printf '\n# Complain-and-Appeal-System: managed by /var/www/Complain-and-Appeal-System/deploy/configure-domains.sh\n%s\n' "$INCLUDE" >> "$PROXY_CONFIG"
fi
docker exec "$PROXY" nginx -t
docker exec "$PROXY" nginx -s reload

if [ ! -f "$CERT_STORE/live/cas.chirocity.gov.et/fullchain.pem" ]; then
  docker exec "$CERTBOT" certbot certonly --webroot -w /var/www/certbot \
    --non-interactive --agree-tos --keep-until-expiring \
    --cert-name cas.chirocity.gov.et \
    -d cas.chirocity.gov.et -d cas-api.chirocity.gov.et
fi
cat deploy/cas-http.conf deploy/cas-https.conf > "$DOMAIN_CONFIG"
docker exec "$PROXY" nginx -t
docker exec "$PROXY" nginx -s reload

# Renewal uses the existing certificate store and reloads the shared proxy.
cat > /etc/cron.d/cas-cert-renewal <<'CRON'
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 3,15 * * * root docker exec hrms-certbot-1 certbot renew --quiet --cert-name cas.chirocity.gov.et && docker exec hrms-proxy-1 nginx -s reload
CRON
chmod 644 /etc/cron.d/cas-cert-renewal

sleep 2
curl --fail --silent --show-error --resolve cas.chirocity.gov.et:443:127.0.0.1 https://cas.chirocity.gov.et/ >/dev/null
curl --fail --silent --show-error --resolve cas-api.chirocity.gov.et:443:127.0.0.1 https://cas-api.chirocity.gov.et/api/health/
echo 'Complain-and-Appeal-System frontend and API domains configured with HTTPS.'
