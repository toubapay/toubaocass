# syntax=docker/dockerfile:1

# Builds the Laravel API as a single container running Octane on FrankenPHP,
# suitable for Railway (binds to $PORT) or any other Docker host.

FROM dunglas/frankenphp:1-php8.3 AS base

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/install-php-extensions
RUN install-php-extensions \
    pdo_pgsql \
    pcntl \
    posix \
    opcache \
    zip \
    intl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# --- Composer dependencies (cached separately from app source) ---
FROM base AS vendor
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# --- Frontend assets (only the default Vite/Tailwind welcome-page build) ---
FROM node:22-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY resources ./resources
COPY vite.config.* ./
RUN npm run build

# --- Final runtime image ---
FROM base AS app

COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build

RUN cp vendor/laravel/octane/src/Commands/stubs/frankenphp-worker.php public/frankenphp-worker.php \
    && composer dump-autoload --optimize --no-dev \
    && php artisan storage:link \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV OCTANE_SERVER=frankenphp

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
