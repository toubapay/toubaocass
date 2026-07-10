#!/bin/sh
set -e

# Runs once per container boot, for both the web (Octane) service and the
# queue-worker service — Railway just overrides the start command for the
# latter, so this stays a shared entrypoint rather than two images.

# Firebase service-account key: never committed to git, so it arrives as a
# raw-JSON env var and gets written to disk here, before config:cache reads
# FCM_CREDENTIALS_PATH (see config/services.php for the matching default).
if [ -n "$FCM_CREDENTIALS_JSON" ]; then
    mkdir -p storage/app
    printf '%s' "$FCM_CREDENTIALS_JSON" > storage/app/fcm-credentials.json
fi

php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan migrate --force
php artisan db:seed --class=DatabaseSeeder --force

if [ "$#" -gt 0 ]; then
    exec "$@"
fi

exec php artisan octane:start \
    --server=frankenphp \
    --host=0.0.0.0 \
    --port="${PORT:-8080}" \
    --workers="${OCTANE_WORKERS:-4}" \
    --max-requests="${OCTANE_MAX_REQUESTS:-500}"
