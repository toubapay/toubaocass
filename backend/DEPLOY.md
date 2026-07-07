# Deploying the backend to Railway

The backend ships as a single Docker image (`Dockerfile`) running the Laravel
API on [Octane](https://laravel.com/docs/octane) + [FrankenPHP](https://frankenphp.dev/),
so it's one container that boots fast and handles concurrent requests without
a separate nginx/php-fpm setup. This repo is a monorepo (`backend/`, `apps/rider/`,
`apps/driver/`), so every Railway service below must have its **Root Directory**
set to `backend`.

## 1. Create the project

1. Railway dashboard → New Project → Deploy from GitHub repo → pick this repo.
2. On the first service Railway creates, open **Settings → Root Directory** and
   set it to `backend`. Railway will detect `backend/Dockerfile` (via
   `backend/railway.json`) and build from that automatically.
3. Add a **PostgreSQL** database plugin to the project (Railway dashboard →
   New → Database → PostgreSQL). Laravel's `pgsql` connection already reads
   a single `DB_URL` variable if set, so on the web (and queue) service just
   add `DB_URL` and reference Railway's Postgres variable:
   `${{Postgres.DATABASE_URL}}` (Railway's variable-reference syntax — pick
   the Postgres service from the autocomplete when typing `${{`). No need to
   set `DB_HOST`/`DB_PORT`/etc. individually.
4. (Optional, recommended) Add a **Redis** plugin if you want to move
   `QUEUE_CONNECTION`/`CACHE_STORE`/`SESSION_DRIVER` off the database once
   traffic grows — the app works fine on the `database` driver at MVP scale.

## 2. Object storage (Cloudflare R2)

Railway's container filesystem is ephemeral — anything written to disk is
lost on redeploy. Car photos and driver KYC documents must go to external
object storage instead:

1. Create a Cloudflare R2 account, then two buckets:
   - one **public** bucket for car photos (enable the bucket's public
     development URL, or attach a custom domain),
   - one **private** bucket for KYC documents (ID, driving license, selfie)
     — do **not** make this one public; it holds personal data.
2. Create an R2 API token (Account → R2 → Manage API Tokens) with read/write
   access to both buckets.
3. Set these variables on the web service (see full list below):
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`
   (`https://<account_id>.r2.cloudflarestorage.com`), `R2_BUCKET` (public),
   `R2_URL` (the public bucket's URL/custom domain), `R2_KYC_BUCKET` (private).
4. Set `FILESYSTEM_DISK=r2` and `KYC_FILESYSTEM_DISK=kyc`.

Locally these default to `FILESYSTEM_DISK=public` (symlinked, world-readable
— fine for dev) and `KYC_FILESYSTEM_DISK=local` (private, no public URL), so
none of this is required to run the app on your machine.

## 3. Environment variables

Set these on the web service (Railway → service → Variables). Anything not
listed here keeps its `.env.example` default.

| Variable | Value |
|---|---|
| `APP_NAME` | `Intercity` |
| `APP_ENV` | `production` |
| `APP_KEY` | generate once with `php artisan key:generate --show`, paste the output |
| `APP_DEBUG` | `false` |
| `APP_URL` | your Railway public domain, e.g. `https://api.intercity.example` |
| `DB_CONNECTION` | `pgsql` |
| `DB_URL` | `${{Postgres.DATABASE_URL}}` (Railway variable reference) |
| `FILESYSTEM_DISK` | `r2` |
| `KYC_FILESYSTEM_DISK` | `kyc` |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_URL`, `R2_KYC_BUCKET` | from step 2 |
| `SMS_DRIVER` | `twilio` (once you have real Twilio credentials; otherwise leave `log`) |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | your Twilio credentials |
| `PUSH_DRIVER` | `fcm` (once configured; otherwise leave `log`) |
| `FCM_PROJECT_ID`, `FCM_CREDENTIALS_PATH` | your Firebase credentials |
| `OTP_BYPASS_CODE` | leave unset in production (only useful for demos) |

Railway sets `PORT` automatically — the entrypoint script already binds
Octane to it, don't set it yourself.

## 4. Queue worker service

Notifications (SMS/push on booking/trip events) are dispatched through
Laravel's queue, so a worker process has to be running or they'll just sit
in the `jobs` table.

1. In the same Railway project, add a **second service** from the same
   GitHub repo/branch.
2. Set its Root Directory to `backend` too (same image/Dockerfile).
3. Override its **Start Command** (Settings → Deploy → Custom Start Command)
   to:
   ```
   php artisan queue:work --tries=3 --max-time=3600
   ```
   The shared `docker/entrypoint.sh` runs migrations once then `exec`s
   whatever command it's given, so this replaces the Octane server with the
   queue worker for this service only.
4. Copy the same environment variables from the web service onto this one
   (Railway lets you reference a shared variable group, or just duplicate
   them).

## 5. Health check

`backend/railway.json` points Railway's health check at `/up`, which Laravel
serves out of the box. No extra route needed.

## 6. First deploy checklist

- [ ] `APP_KEY` generated and set (once — don't regenerate after real data exists)
- [ ] Postgres plugin attached, `DB_URL` set, migrations run automatically on boot
- [ ] R2 buckets created, `FILESYSTEM_DISK=r2` / `KYC_FILESYSTEM_DISK=kyc` set
- [ ] Queue worker service added with the overridden start command
- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] Mobile apps' `API_BASE_URL` (`apps/rider/.env`, `apps/driver/.env`) point at the Railway domain
