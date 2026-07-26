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

## 2. Object storage (AWS S3, or any S3-compatible provider)

Railway's container filesystem is ephemeral — anything written to disk is
lost on redeploy. Car photos and driver KYC documents must go to external
object storage instead. The `s3`/`kyc` disks (`config/filesystems.php`) work
with real AWS S3 out of the box, or any S3-compatible provider (Cloudflare
R2, Backblaze B2, DigitalOcean Spaces, MinIO, etc.) by pointing `AWS_ENDPOINT`
at it.

**Using AWS S3:**
1. Create two buckets in the same AWS account/region:
   - one **public-read** bucket for car photos (bucket policy allowing
     `s3:GetObject` publicly, or serve via CloudFront),
   - one **private** bucket for KYC documents (ID, driving license, selfie)
     — leave this one fully private; it holds personal data.
2. Create an IAM user (or role) with read/write access scoped to both
   buckets, and generate an access key pair for it.
3. Set on the web service: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
   `AWS_DEFAULT_REGION` (e.g. `us-east-1`), `AWS_BUCKET` (public bucket name),
   `AWS_URL` (the public bucket's URL, e.g.
   `https://<bucket>.s3.<region>.amazonaws.com`), `AWS_KYC_BUCKET` (private
   bucket name). Leave `AWS_ENDPOINT` blank and `AWS_USE_PATH_STYLE_ENDPOINT=false`
   — both are only needed for non-AWS S3-compatible providers.
4. Set `FILESYSTEM_DISK=s3` and `KYC_FILESYSTEM_DISK=kyc`.

**Using an S3-compatible provider instead (e.g. Cloudflare R2):** same steps,
but also set `AWS_ENDPOINT` to the provider's endpoint URL,
`AWS_DEFAULT_REGION=auto`, and `AWS_USE_PATH_STYLE_ENDPOINT=true`.

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
| `LOG_CHANNEL` | `stderr` — Railway's log tabs only capture stdout/stderr, not files inside the container, so the default `stack`/`single` channel (which writes to `storage/logs/laravel.log`) is invisible in the dashboard |
| `DB_CONNECTION` | `pgsql` |
| `DB_URL` | `${{Postgres.DATABASE_URL}}` (Railway variable reference) |
| `FILESYSTEM_DISK` | `s3` |
| `KYC_FILESYSTEM_DISK` | `kyc` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `AWS_URL`, `AWS_KYC_BUCKET` | from step 2 (plus `AWS_ENDPOINT`/`AWS_USE_PATH_STYLE_ENDPOINT` if using R2 or another S3-compatible provider) |
| `SMS_DRIVER` | `promobile` (Promobile BULKSMS, the "Facili" account) or `twilio`; otherwise leave `log` |
| `PROMOBILE_TOKEN` | your Promobile API key (Manage API Keys in their dashboard) |
| `PROMOBILE_FROM` | `Ocass` (the sender ID recipients see) |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | your Twilio credentials (only needed if using `SMS_DRIVER=twilio` instead) |
| `PUSH_DRIVER` | `fcm` (once configured; otherwise leave `log`) |
| `FCM_PROJECT_ID` | your Firebase project ID |
| `FCM_CREDENTIALS_JSON` | the *entire contents* of the Firebase service-account JSON (Console → Project settings → Service accounts → Generate new private key), pasted as one Railway variable value — it's already single-line JSON, no reformatting needed. `docker/entrypoint.sh` writes it to `storage/app/fcm-credentials.json` at container boot; leave `FCM_CREDENTIALS_PATH` unset unless you're mounting the file another way |
| `OTP_BYPASS_CODE` | leave unset in production (only useful for demos) |
| `GOOGLE_MAPS_SERVER_KEY` | optional — a *server-side* Google Maps key (restrict to this server's IP + the Distance Matrix API only; distinct from the client apps' `GOOGLE_MAPS_API_KEY`) for real driving-distance/duration between cities. Without it, route distance falls back to a straight-line estimate — the feature still works, just less precise |

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

## 5. Scheduler service

`routes/console.php` registers `Schedule::command(...)` entries (backups,
`trips:finish-stale` which auto-completes trips left open more than a day
past their departure, and `anando:terminate-stale` which does the same for
Anando rides more than 5 hours past posting) — none of these ever fire on
their own. Laravel's scheduler needs something to actually call
`schedule:run` every minute, and Railway doesn't run cron for you.

1. In the same Railway project, add a **third service** from the same
   GitHub repo/branch (same as the queue worker above).
2. Set its Root Directory to `backend` too (same image/Dockerfile).
3. Override its **Start Command** to:
   ```
   php artisan schedule:work
   ```
   This is a long-running process (not a one-shot cron invocation) that
   sleeps and calls any due scheduled command every minute — the shared
   `docker/entrypoint.sh` `exec`s it in place of the Octane server for this
   service only, same mechanism as the queue worker.
4. Copy the same environment variables from the web service onto this one.

Without this service, scheduled commands are silently never invoked — the
code runs correctly once triggered, but nothing ever triggers it.

## 6. Health check

`backend/railway.json` doesn't set a `healthcheckPath` — the web,
queue-worker, and scheduler services all share this config file (same
repo/root directory), and neither the queue worker nor the scheduler serve
HTTP, so a shared health check would always fail for them. Railway falls
back to considering a deployment healthy once the container stays up.
Laravel does still serve `/up` if you want to wire up an external uptime
monitor against the web service specifically.

## 7. First deploy checklist

- [ ] `APP_KEY` generated and set (once — don't regenerate after real data exists)
- [ ] Postgres plugin attached, `DB_URL` set, migrations run automatically on boot
- [ ] S3/R2 buckets created, `FILESYSTEM_DISK=s3` / `KYC_FILESYSTEM_DISK=kyc` set
- [ ] Queue worker service added with the overridden start command
- [ ] Scheduler service added with the `schedule:work` start command
- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] Mobile apps' `API_BASE_URL` (`apps/rider/.env`, `apps/driver/.env`) point at the Railway domain
