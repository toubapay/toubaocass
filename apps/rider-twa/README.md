# Intercity — rider TWA (Play Store wrapper)

This is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/) —
a thin native Android shell around the rider PWA (`apps/web`), generated with
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). It opens the real
website full-screen, with no browser chrome, as a normal-looking installed app.
It is **not** a rewrite of the app — there is no separate UI to maintain here;
every screen, string, and fix still lives in `apps/web`.

- Package name: `com.intercity.rider`
- Opens: `https://intercity-frontends.onrender.com/`
- Separate from, not a replacement for, the existing Expo (`apps/rider`) and
  Flutter (`apps/rider_flutter`) apps — a third, independent Play Store listing.

## Rebuilding

This directory is a config + Android Studio project, generated once and checked
in like any other app. You only need to **regenerate** it (`bubblewrap init`)
if the web app's `manifest.webmanifest` changes in a way that should carry over
here — a new icon, theme color, or app name. For everything else (a new
screen, a bug fix, a new feature) you don't touch this directory at all — it
just opens whatever is live on `apps/web`.

To build a signed `.aab` for Play Store upload:

```bash
npm install -g @bubblewrap/cli
bubblewrap build
```

Run from inside this directory. The first run offers to install its own JDK 17
and Android SDK command-line tools (recommended — say yes). It will ask for
the keystore password — see "Signing key" below.

If `manifest.webmanifest` changed and you want those changes reflected here:

```bash
bubblewrap update --manifest=https://intercity-frontends.onrender.com/manifest.webmanifest
```

## Signing key

**The keystore is not in this repository** — keystores are secrets, never
committed to git, same as every other credential in this project (see the
Render env vars marked `sync: false`). It was handed to you separately
(`rider.keystore` + its password) — store it in your password manager /
secrets vault, not just on one laptop. **If this key is lost, you can never
publish an update to this app again under the same package name** — Google
Play has no recovery for an upload key you've lost (unless Play App Signing
is enabled — see below, which is why enabling it matters).

`twa-manifest.json`'s `signingKey.path` points at wherever you place the
keystore locally — adjust it, or pass `--ks=/path/to/rider.keystore` to
`bubblewrap build` directly.

## First-time Play Console setup

1. Create the app in [Play Console](https://play.google.com/console) — package
   name `com.intercity.rider` — and **enable Play App Signing** (the default
   for new apps; keep it on). This means Google re-signs the app for actual
   distribution, and losing the upload key above becomes recoverable (you can
   request a new upload key from Google) instead of catastrophic.
2. Upload the `.aab` from `bubblewrap build` to an internal testing track first.
3. Once Play App Signing is enabled, go to **Setup → App integrity → App
   signing** in Play Console and copy the **App signing key certificate**
   SHA-256 fingerprint.
4. Add that fingerprint to `apps/web/public/.well-known/assetlinks.json`
   alongside (not instead of — both can coexist) the upload key fingerprint
   already there, then redeploy `apps/web`. Without this, the installed app
   opens as a regular browser tab (with URL bar) instead of full-screen — the
   TWA falls back to Custom Tabs when Digital Asset Links verification fails.
5. Verify: `https://intercity-frontends.onrender.com/.well-known/assetlinks.json`
   should be reachable and list `com.intercity.rider`.

## If you move to a custom domain

The `host` in `twa-manifest.json` (currently the `onrender.com` URL, since
that's what's actually live) is baked into the signed app — Android checks it
against Digital Asset Links at install/launch time. Moving to a custom domain
later means: update `host` here, host a new `assetlinks.json` at the new
domain's root, and publish a new app version. The existing Play Store listing
itself doesn't need to be recreated, just updated.
