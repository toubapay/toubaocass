# Intercity — Web (rider)

Browser version of the rider app, built with React + Vite + TypeScript. Talks
to the same Laravel API as the `apps/rider` and `apps/driver` mobile apps —
same phone/OTP auth, same trip search/booking endpoints.

## Local development

```
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your backend
npm run dev
```

`VITE_API_BASE_URL` defaults to `http://localhost:8000/api` if unset. Point
it at your local `php artisan serve` for local dev, or at a deployed backend
(e.g. the Railway URL) to test against real data without running the backend
yourself.

## Build

```
npm run build
```

Outputs a static site to `dist/` — deployable to any static host (Vercel,
Netlify, Railway static service, S3+CloudFront, etc.). No server-side
rendering, no Node runtime needed at serve time.

## What's implemented

- Phone + OTP authentication (same Sanctum token flow as the mobile apps)
- Home: browsable trip listing with origin/destination/date/seats filters
  and "near me" geolocation search
- Trip detail: driver/vehicle/fare info, departure point (Google Maps link),
  seat stepper, booking
- My Bookings: list + cancel
- Profile: view info, log out

Not implemented (mobile-only, or intentionally out of scope for a first
pass): embedded departure-point map preview (falls back to a Google Maps
link, same as the mobile apps' own web build), push notifications.
