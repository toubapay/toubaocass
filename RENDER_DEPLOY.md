# Deploying to Render

This repo also has a Railway-oriented setup (`backend/DEPLOY.md`, one
service per Railway component). This doc covers the alternative Render
setup, built around exactly **3 instances total**:

| Instance | What it runs | Defined by |
|---|---|---|
| `intercity-frontends` | apps/web (`/`), apps/driver-web (`/driver`), apps/admin (`/admin`) — one nginx container, one domain | `Dockerfile.frontends` + `nginx.frontends.conf.template` |
| `intercity-backend` | Laravel API + queue worker + scheduler, all in one container via supervisord | `backend/Dockerfile` + `backend/docker/supervisord.conf` |
| `intercity-db` | Managed Postgres | Render database resource |

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that creates all three in one shot.

## 1. Deploy the Blueprint

1. Render dashboard → **New** → **Blueprint** → connect this GitHub repo →
   pick the branch.
2. Render reads `render.yaml` and shows a plan: 2 web services +
   1 Postgres database. Click **Apply**.
3. Every `sync: false` env var (Firebase keys, `APP_KEY`, SMS/push
   credentials, etc.) is created empty — go to each service's
   **Environment** tab and fill them in (see the tables below). The
   database's `DB_URL` is wired automatically via `fromDatabase`; you don't
   set it yourself.
4. First deploy will fail health checks until `APP_KEY` is set on
   `intercity-backend` (see step 2 of the checklist) — that's expected,
   just add it and redeploy.

## 2. Why the 3 frontends can share one instance

`apps/web`, `apps/driver-web`, and `apps/admin` are 3 independent Vite +
React Router apps. To serve them from **one** nginx container on **one**
domain, `apps/driver-web` and `apps/admin` were given a fixed URL prefix:

- `vite.config.ts` sets `base: '/driver/'` / `base: '/admin/'`, so their
  own JS/CSS/asset URLs come out already prefixed.
- `<BrowserRouter basename="/driver">` / `basename="/admin"` so client-side
  routing matches.
- `index.html`, `manifest.webmanifest`, and any hardcoded `/icons/...`,
  `/sounds/...`, `/favicon.svg` references in source were updated to match
  (driver-web) or prefixed (admin).

`apps/web` is untouched — it still owns the domain root (`/`).

`nginx.frontends.conf.template` (baked into the image via
`Dockerfile.frontends`) routes by path prefix:

```
https://<frontends-domain>/          -> apps/web
https://<frontends-domain>/driver/   -> apps/driver-web
https://<frontends-domain>/admin/    -> apps/admin
```

If you'd rather split them across 3 subdomains instead of one domain +
path prefixes (no code changes needed for that scheme — nginx would
switch from path-based `location` blocks to `server_name`-based blocks),
that's a valid alternative; ask before switching since it changes what
DNS records you need and reverses some of the prefixing above.

## 3. Custom domains

The `VITE_API_BASE_URL`, `APP_URL`, and `WEB_FRONTEND_URL` values in
`render.yaml` use placeholder domains (`app.example.com`,
`api.example.com`). Once you have real domains:

1. Render dashboard → each service → **Settings → Custom Domains** → add
   your domain, point its DNS (CNAME or ALIAS/ANAME per Render's
   instructions) at the service.
2. Update `render.yaml`'s placeholder values (or just edit them directly
   in each service's Environment tab — either works; the dashboard wins
   over the Blueprint file after the first apply).
3. Redeploy `intercity-frontends` after changing `VITE_API_BASE_URL` /
   `VITE_ADMIN_API_BASE_URL` — these are baked into the JS bundle at build
   time, so a plain restart isn't enough, it needs a rebuild.

Until you have real domains, everything works fine on the free
`*.onrender.com` URLs Render assigns each service.

## 4. Object storage — persistent Disk, no S3 required

Unlike Railway (fully ephemeral filesystem, hence `backend/DEPLOY.md`
requires S3), Render supports **persistent Disks** attached to a single
instance. `render.yaml` attaches one to `intercity-backend` at
`/app/storage/app`, so car photos, KYC documents, and carte grise scans
written to the app's own default `public`/`local` disks
(`FILESYSTEM_DISK=public`, `KYC_FILESYSTEM_DISK=local` — the same dev-mode
defaults from `.env.example`) actually survive redeploys.

Trade-off: persistent Disks only attach to a service running **exactly one
instance** — you can't horizontally scale `intercity-backend` past 1
replica with this setup. If you outgrow that, switch to S3 (or an
S3-compatible provider) following `backend/DEPLOY.md`'s "Object storage"
section — the app already supports both, it's just an env var change
(`FILESYSTEM_DISK=s3`, `AWS_*` vars) plus removing the `disk:` block from
`render.yaml`.

## 5. All-in-one backend process (supervisord)

Railway's setup runs the API, queue worker, and scheduler as 3 separate
services sharing one image. Render's `intercity-backend` runs all 3 as one
process group inside a single container, via
`backend/docker/supervisord.conf`, activated by the `RUN_ALL_IN_ONE=true`
env var (set in `render.yaml`):

- `octane` — the actual HTTP server Render health-checks (`/up`) and
  routes traffic to.
- `queue-worker` — `php artisan queue:work`, so SMS/push notification jobs
  actually get dispatched.
- `scheduler` — `php artisan schedule:work`, so `trips:finish-stale` /
  `anando:terminate-stale` / backups actually fire.

If one of the three crashes, supervisord restarts just that one process;
the container (and the other two processes) keep running. This flag only
changes behavior when explicitly set to `true` — `backend/Dockerfile` and
`entrypoint.sh` are otherwise unchanged, so the existing Railway multi-service
setup in `backend/DEPLOY.md` still works exactly as documented.

## 6. Environment variables

### `intercity-frontends`

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Backend's public URL, e.g. `https://api.example.com` |
| `VITE_ADMIN_API_BASE_URL` | Same backend URL |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY` | Firebase console → Project settings → Your apps → Web app |
| `VITE_GOOGLE_MAPS_API_KEY` | A *browser-restricted* Google Maps key (Maps JS + Places APIs) |

### `intercity-backend`

Mostly the same variables as `backend/DEPLOY.md`'s table — the notable
Render-specific differences are `DB_URL` (auto-wired via `fromDatabase`,
don't set manually), `RUN_ALL_IN_ONE=true`, and no `AWS_*` vars needed by
default (see §4).

| Variable | Value |
|---|---|
| `APP_KEY` | generate once with `php artisan key:generate --show`, paste the output |
| `APP_URL` | this service's public URL, e.g. `https://api.example.com` |
| `WEB_FRONTEND_URL` | `intercity-frontends`' domain root, e.g. `https://app.example.com` (used for the SOS share-tracking link text) |
| `SMS_DRIVER` / `PROMOBILE_TOKEN` / `PROMOBILE_FROM` | `promobile` + your Promobile credentials, or leave `log` |
| `PUSH_DRIVER` / `FCM_PROJECT_ID` / `FCM_CREDENTIALS_JSON` | `fcm` + your Firebase service-account JSON (paste the whole file contents as one value), or leave `log` |
| `OTP_BYPASS_CODE` | leave unset in production |
| `GOOGLE_MAPS_SERVER_KEY` | optional — a *server-side* key restricted to this service's IP, for real driving-distance lookups |

`DB_URL`, `PORT`, `RUN_ALL_IN_ONE`, `FILESYSTEM_DISK`, `KYC_FILESYSTEM_DISK`
are already set correctly by `render.yaml` — nothing to do there.

## 7. First deploy checklist

- [ ] Blueprint applied (`render.yaml` → 2 services + 1 database created)
- [ ] `APP_KEY` generated and set on `intercity-backend`
- [ ] Firebase web push vars set on `intercity-frontends` (or leave unset —
      push notifications degrade gracefully, everything else still works)
- [ ] `intercity-backend`'s health check (`/up`) passing
- [ ] Placeholder domains swapped for real ones (or accept the free
      `*.onrender.com` URLs for now) — §3
- [ ] `intercity-frontends` rebuilt after any `VITE_*` env var change
      (build-time, not runtime)
- [ ] Smoke test: open the frontends URL, confirm `/`, `/driver`, `/admin`
      each load their own app and can reach the API
