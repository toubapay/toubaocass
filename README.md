# Intercity — Book a Seat, City to City

An Uber-style platform for **intercity** ride-sharing: taxi owners (drivers) post
seat availability for a scheduled trip between two cities, and riders search,
book, and pay for a seat. Built as four projects in one repo:

```
backend/            Laravel 13 API (Sanctum auth, OTP, KYC, trips, bookings, notifications)
apps/rider/         Expo (React Native + TypeScript) app for riders
apps/driver/        Expo (React Native + TypeScript) app for drivers
apps/web/           React + Vite web app for riders (same backend API as the mobile apps)
apps/rider_flutter/ Flutter app for riders — alternative client, same backend API
apps/driver_flutter/ Flutter app for drivers — alternative client, same backend API
```

## How it works

- **Drivers** sign up with phone + OTP, submit KYC (ID, driving license,
  selfie), add one or more vehicles (type, make, model, seat count), and post
  trips: origin city, destination city, date, time, fare per seat, and a ride
  tier (Standard / Comfort / XL — Uber-style service levels).
- **Riders** sign up with phone + OTP, search trips by origin/destination
  city, date, and seats needed, then book a seat.
- Seat inventory is enforced server-side under a row lock: a car with 4 seats
  accepts at most 4 booked seats, and the trip flips to **full** the moment
  the last seat is taken — new booking attempts are rejected from that point
  on. Cancelling a booking frees the seat back up and reopens a full trip.
- Both sides get SMS + push notifications for OTP codes, new bookings, a
  trip going full, and cancellations.
- Drivers can drop a precise departure pin (Google Maps) and a meeting-point
  description when posting a trip; riders can search "near me" using their
  device location, see distance-to-departure on each result, and open the
  pin in Google Maps from the trip detail screen.

## Repo layout & tech choices

| Concern | Choice |
|---|---|
| Backend | Laravel 13, Sanctum (bearer tokens), PostgreSQL |
| Auth | Phone + OTP (no passwords). One phone number can hold a separate rider account and driver account. |
| Mobile | Expo SDK 57, React Native, TypeScript, React Navigation |
| Push | Firebase Cloud Messaging (HTTP v1 API), pluggable behind a `PushGateway` interface |
| SMS | Twilio (or any provider), pluggable behind an `SmsGateway` interface — logs to file in dev |
| Maps/location | `expo-location` (device GPS) + `react-native-maps` with the Google provider |

---

## Backend (Laravel)

### Why PostgreSQL

The core business rule — a car with N seats never accepts more than N
bookings, even under concurrent requests — is enforced with a
`SELECT ... FOR UPDATE` row lock in `BookingController` (see
`app/Http/Controllers/Api/BookingController.php`). That only does its job
under a database with real row-level locking and MVCC. PostgreSQL was
chosen over MySQL/SQLite for this reason, plus better constraint/type
support if geolocation or fare-splitting logic is added later. The test
suite runs against a real Postgres instance for the same reason (see
`phpunit.xml`) rather than SQLite, which would mask locking bugs.

### Setup

```bash
# Create the app + test databases (adjust user/password to taste)
createdb toubaocass
createdb toubaocass_testing

cd backend
composer install
cp .env.example .env
php artisan key:generate
# edit .env: DB_DATABASE=toubaocass, DB_USERNAME/DB_PASSWORD to match your Postgres role
php artisan migrate --seed   # seeds Senegalese cities: Dakar, Touba, Thiès, ...
php artisan serve            # http://localhost:8000
```

### Local development shortcuts

- `OTP_BYPASS_CODE` in `.env` — set to a fixed 6-digit code (e.g. `123456`) to
  skip needing a real SMS provider while building the mobile apps. Leave
  unset in production.
- `SMS_DRIVER=log` and `PUSH_DRIVER=log` (defaults) write outbound
  messages to `storage/logs/laravel.log` instead of calling a real provider.
  Switch to `SMS_DRIVER=twilio` (set `TWILIO_SID`, `TWILIO_TOKEN`,
  `TWILIO_FROM`) and `PUSH_DRIVER=fcm` (set `FCM_PROJECT_ID`,
  `FCM_CREDENTIALS_PATH` pointing at a Firebase service-account JSON file)
  to go live.

### Tests

Requires the `toubaocass_testing` database created above (see `phpunit.xml`
for the connection env used during tests).

```bash
php artisan test
```

19 feature tests cover OTP auth (including that the same phone number can
hold independent rider/driver accounts), KYC submission, car management,
trip creation gated on approved KYC, and — the core business rule — seat
booking/overbooking/cancellation/trip-full/trip-cancellation behavior,
exercised against real Postgres row locks rather than mocked.

### API summary

All endpoints are under `/api`. Auth is a Sanctum bearer token from
`POST /auth/otp/verify`.

| Endpoint | Who | Purpose |
|---|---|---|
| `POST /auth/otp/request` | public | Send a 6-digit OTP by SMS to `{phone, role}` |
| `POST /auth/otp/verify` | public | Verify code, create/find the account, return a token |
| `GET /me` / `PUT /profile` | any | Fetch/complete the signed-in profile |
| `POST /fcm-token` | any | Register a device push token |
| `GET /cities` | public | City picker data |
| `GET /driver/kyc`, `POST /driver/kyc` | driver | View / submit KYC documents (multipart) |
| `GET/POST/PUT/DELETE /driver/cars[/:id]` | driver | Manage vehicles |
| `GET/POST /driver/trips`, `GET/PUT/DELETE /driver/trips/:id`, `POST /driver/trips/:id/{start,complete}` | driver | Post & manage trips |
| `GET /trips`, `GET /trips/:id` | rider | Search / view trips |
| `POST /trips/:id/bookings` | rider | Book N seats |
| `GET /bookings`, `DELETE /bookings/:id` | rider | View / cancel own bookings |

Role-scoped routes are protected by a `role:{rider|driver}` middleware, and
ownership (a driver editing *their* car/trip, a rider cancelling *their*
booking) is enforced via Laravel policies.

`GET /trips` also accepts `lat`, `lng`, and `radius_km` (default 50) to
search by proximity to a point instead of/alongside the city filters. When
given, results are limited to trips with a departure pin within that radius
and ordered by distance (nearest first); each result gets a `distance_km`
field. Distance is computed with the Haversine formula directly in SQL
(`app/Support/Geo.php`) rather than a PostGIS/earthdistance extension, so it
works on any Postgres instance without extra setup. `POST`/`PUT` on
`/driver/trips` accept optional `departure_latitude`, `departure_longitude`,
and `departure_address` for the driver's exact meeting point.

---

## Mobile apps (Expo)

Each app is an independent Expo project so they can be built and released
separately (app stores generally want the rider and driver experiences as
separate listings).

```bash
cd apps/rider   # or apps/driver
npm install
cp .env.example .env   # set GOOGLE_MAPS_API_KEY, adjust API_BASE_URL if needed
npx expo start
```

Config is dynamic (`app.config.js`, not a static `app.json`) specifically so
`API_BASE_URL` and `GOOGLE_MAPS_API_KEY` can come from `.env` instead of
being hardcoded — `API_BASE_URL` defaults to `http://localhost:8000/api`,
which only works from a simulator on the same machine; use your LAN IP for a
physical device.

### Rider app (`apps/rider`)

Phone/OTP sign-up → profile → home feed (browsable listing, filterable by
city/date/seats, or "Find rides near me" using device location) → trip
detail (driver, car, fare, seats left, departure map) → book → **My
Bookings** (view/cancel) → **Profile**.

### Driver app (`apps/driver`)

Phone/OTP sign-up → profile → **Verification** (submit ID/license/selfie,
track approval status) → **Fleet** (add vehicles) → **Trips** (post a trip —
optionally drop a departure pin on the map or use current location, see
riders booked on it, start/complete/cancel it) → **Profile**.

### Google Maps & location

Both apps use `expo-location` (device GPS) and `react-native-maps` (Google
provider) for the departure-point features above. A few things worth
knowing:

- **Get a key** at the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
  with "Maps SDK for Android" and "Maps SDK for iOS" enabled, then put it in
  each app's `.env` as `GOOGLE_MAPS_API_KEY`. Without a key the map simply
  won't render tiles on a real build — everything else in the app still
  works.
- **`expo start --web` never touches react-native-maps at all.** It has no
  web renderer, so `DepartureMap`/`DeparturePicker` are split into a native
  file (`Component.tsx`, real Google map) and a web file
  (`Component.web.tsx`, address text + an "Open in Google Maps" link /
  "use current location" button). Metro picks whichever matches the build
  target automatically. `expo-location` itself works fine on web via the
  browser's geolocation API, so "find rides near me" is fully usable there.
- The map pieces themselves need a real device/simulator (or `eas build` /
  `expo prebuild`) to see rendered — Expo Go's shared debug Maps key covers
  Android for quick testing, but iOS's `PROVIDER_GOOGLE` needs your own key
  either way.

### Push notifications

Both apps request notification permission and register the device's native
push token (`expo-notifications` + `expo-device`) via `POST /fcm-token`.
Delivering real pushes end-to-end requires building each app with Firebase
config (`google-services.json` for Android / `GoogleService-Info.plist` for
iOS via `expo prebuild` or EAS Build) and setting `PUSH_DRIVER=fcm` on the
backend — in Expo Go / dev-client without that config, pushes are logged
server-side instead of delivered, which is enough to develop and test the
booking flow end-to-end.

---

## Flutter apps (alternative clients)

`apps/rider_flutter/` and `apps/driver_flutter/` are Flutter/Dart clients
covering the same functionality as the Expo apps above — auth/OTP, profile
setup, trip search/booking/history/maps (rider), KYC/fleet/trip-posting/
management/maps (driver), Anando carpooling, Dem Légui on-demand rides,
Livraison deliveries, Assurance (the scan-a-carte-grise vehicle insurance
flow), SOS/live-location sharing, and FCM push — against the exact same
backend API. They run alongside the Expo apps rather than replacing them;
nothing else in this repo changes because of their presence.

```bash
cd apps/rider_flutter   # or apps/driver_flutter
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:8000/api
```

- **Firebase**: same pattern as the Expo apps — download `google-services.json`
  / `GoogleService-Info.plist` from the Firebase console for these apps'
  package IDs (`com.intercity.rider_flutter` / `com.intercity.driver_flutter`)
  and place them at `android/app/google-services.json` and
  `ios/Runner/GoogleService-Info.plist` (gitignored). The Android Gradle
  plugin only activates once that file exists, so `flutter build`/`analyze`/
  `test` work fine without it.
- **Google Maps key**: pass `-PmapsApiKey=...` to Gradle (or set
  `mapsApiKey=...` in `android/local.properties`, gitignored) before building
  for Android; wire the iOS key manually in Xcode per `google_maps_flutter`'s
  setup docs.
- **Departure-point picker**: the driver app's map-based pickup-point picker
  (tap/drag a pin, or snap to current GPS) matches the Expo app's, minus its
  address-autocomplete search-as-you-type — a deliberate scope trim, not a
  missing feature.
- Verified in this repo via `flutter analyze` (zero errors in both apps),
  `flutter test` (unit tests for the ported urgency/fill-state trip logic),
  and `flutter build web`. Native Android/iOS builds need a real Android SDK
  / Xcode toolchain and a physical device or emulator to verify further —
  same constraint the Expo apps' EAS builds already have outside this repo.

---

## What's out of scope for now

This covers the full registration → KYC → post trip → search → book → notify
loop end-to-end, but a production launch would still want: in-app payments
(currently fare is informational, settled outside the app), an admin/back-
office to review KYC submissions, driver ratings from completed trips, and
S3-backed storage for KYC documents/car photos instead of local disk.
