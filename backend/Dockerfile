# syntax=docker/dockerfile:1

# Builds the Laravel API as a single container running Octane on FrankenPHP,
# suitable for Railway (binds to $PORT) or any other Docker host.

FROM dunglas/frankenphp:1-php8.4 AS base

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/install-php-extensions
RUN install-php-extensions \
    pdo_pgsql \
    pcntl \
    posix \
    opcache \
    zip \
    intl

# supervisor: only used when RUN_ALL_IN_ONE=true (single-instance hosts like
# Render), to run Octane + the queue worker + the scheduler as one process
# group instead of as separate services. See docker/supervisord.conf.
RUN apt-get update \
    && apt-get install -y --no-install-recommends supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# --- Composer dependencies (cached separately from app source) ---
FROM base AS vendor
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# This is a JSON API backend for the rider/driver mobile apps only — no
# blade views are served, so there's no Vite/Node asset build here.

# --- Final runtime image ---
FROM base AS app

COPY . .
COPY --from=vendor /app/vendor ./vendor

RUN cp vendor/laravel/octane/src/Commands/stubs/frankenphp-worker.php public/frankenphp-worker.php \
    && composer dump-autoload --optimize --no-dev \
    && php artisan storage:link \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf

ENV OCTANE_SERVER=frankenphp

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
