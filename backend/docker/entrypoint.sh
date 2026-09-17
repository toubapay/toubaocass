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

# On Render, storage/app is a persistent disk mounted at container *start*
# (see render.yaml's `disk:`), not part of the image — it's a separate
# volume with its own on-disk ownership, which does not inherit the
# Dockerfile's build-time `chown -R www-data:www-data /app/storage`. Octane
# and the queue worker run as www-data (see supervisord.conf), so without
# re-chowning here on every boot, any write under storage/app — KYC/carte
# grise uploads, the FCM credentials file above, logs — fails with a
# permission error that surfaces to users as a bare "Server Error".
# Harmless where storage/app isn't a separate mount (local dev, Railway).
chown -R www-data:www-data storage bootstrap/cache

php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan migrate --force
php artisan db:seed --class=DatabaseSeeder --force

if [ "$#" -gt 0 ]; then
    exec "$@"
fi

# Single-instance hosts (Render) run the API, queue worker, and scheduler as
# one process group via supervisord instead of as separate services — set
# RUN_ALL_IN_ONE=true on that service only. Railway's existing separate
# queue-worker/scheduler services pass their own start command above, so
# they're unaffected by this branch.
if [ "$RUN_ALL_IN_ONE" = "true" ]; then
    exec supervisord -c /etc/supervisor/supervisord.conf
fi

exec php artisan octane:start \
    --server=frankenphp \
    --host=0.0.0.0 \
    --port="${PORT:-8080}" \
    --workers="${OCTANE_WORKERS:-4}" \
    --max-requests="${OCTANE_MAX_REQUESTS:-500}"
