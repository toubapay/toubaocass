#!/bin/sh
set -e

# Runs once per container boot, for both the web (Octane) service and the
# queue-worker service — Railway just overrides the start command for the
# latter, so this stays a shared entrypoint rather than two images.

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
