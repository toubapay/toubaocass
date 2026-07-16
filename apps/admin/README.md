# Intercity — Admin back-office

Staff-facing back-office for the Intercity platform, built with React + Vite
+ TypeScript. Talks to the same Laravel backend as the rider/driver apps, but
via a completely separate `admin_users` identity/guard — staff log in with
email + password, not phone/OTP, and never share an account with a
rider/driver.

## Local development

```
npm install
cp .env.example .env   # then set VITE_ADMIN_API_BASE_URL to your backend
npm run dev
```

`VITE_ADMIN_API_BASE_URL` defaults to `http://localhost:8000/api/admin` if
unset.

### Creating the first super_admin

There's no open registration endpoint. Bootstrap the first account from the
backend:

```
cd ../../backend
php artisan admin:create-super-admin you@example.com "Your Name"
```

Further staff accounts are created by a super_admin through the app itself
(planned for a later phase).

## Build

```
npm run build
```

Outputs a static site to `dist/` — deployed as its own Railway service
(Dockerfile + nginx), same pattern as `apps/web`.

## Roles

`super_admin`, `admin`, `controllers`, `support`, `accountant`, `superviseur`
— each with a different fixed permission set (see
`backend/app/Support/AdminPermissions.php`). The frontend never hardcodes the
permission matrix; it reads the `permissions` array from `GET /api/admin/me`
and gates navigation/actions off that.

## What's implemented (Phase 1)

- Admin login (email/password), session persisted via a Sanctum token
- Desktop sidebar shell, permission-gated navigation
- Users: search/filter list (role, status), detail view, suspend/reactivate

Not implemented yet (planned in later phases): KYC review workflow, fare/fee
and commission configuration, the reporting dashboard and live trip map,
security alerts, backups, and full staff-account management UI.
