---
name: testing-assetguard-web
description: How to run and test the AssetGuard static web app locally — unit tests, serving the static pages, and verifying the Firebase auth guard / login flow.
---

# Testing AssetGuard web (use-assetguard-web1)

## Layout
- Plain multi-page static site, **no build step**. Every `*.html` at the repo root is a page.
- `index.html` — login page (Firebase **compat** SDK v8, inline `<script>`).
- `auth-guard.js` — ES module, imported by every page except `index.html` and `admin.html`
  (`<script type="module" src="auth-guard.js">` in `<head>`). It sets
  `document.documentElement.style.visibility = "hidden"`, then on `onAuthStateChanged`
  either clears the visibility (signed in) or does `window.location.replace("index.html")`.
- `admin.html` — **not** guarded by `auth-guard.js`. It has its own login card and calls
  `auth.signInWithEmailAndPassword()` itself, so the page is reachable unauthenticated
  (only the login card is visible before login). Expect this; it is a known finding, not a regression.
- `server.js` — separate Express `POST /stk-push` proxy for Safaricom M-Pesa Daraja.
  Requires real Daraja credentials, so treat live STK push as out of scope. It exports the
  app and only calls `app.listen` under `require.main === module`, so it is unit-testable.

## Unit tests
```bash
npm install          # already run by the blueprint's maintenance step
npm test             # vitest run
npm run coverage     # vitest run --coverage
```
`vitest.config.mjs` contains a `stub-firebase-cdn` plugin that rewrites the
`https://www.gstatic.com/firebasejs/.../firebase-{app,auth,database}.js` specifiers inside
`auth-guard.js` / `settings.js` to `test/stubs/*`. If you add a new browser module that imports
Firebase from the CDN, extend the regex in that plugin (it only matches `auth-guard.js` and
`settings.js`) or the test will try to fetch the CDN and fail.

## Serving the site for browser testing
Serve from the **repo root** so the relative `auth-guard.js` / `settings.js` paths resolve:
```bash
python3 -m http.server 8099    # then http://localhost:8099/index.html
```
`npx serve .` also works. `npm start` is NOT the web server — it only starts the Express STK API.

Firebase config is hardcoded in the page sources (project `assetguard-c8c8c`), so auth works
against the real Firebase project from `localhost` with no extra setup — but outbound network
access to `www.gstatic.com` and `identitytoolkit.googleapis.com` is required. If the guard
redirects instantly on every page *including* when signed in, suspect a blocked CDN import.

## Verifying the auth guard / login flow
- Use a fresh/incognito profile so there is no cached Firebase session.
- Type each guarded URL (`dashboard.html`, `purchases.html`, `sales.html`, `stock.html`,
  `settings.html`) into the address bar. Expected: the page renders **blank** (visibility hidden),
  then the URL becomes `index.html`. Screenshot mid-load to prove there is no content flash —
  DOM checks alone are not proof.
- On `index.html` the form is behind a flip card: click the **LOGIN** pill at the top before the
  "Sign In" / Email Address / Password-PIN fields are visible.
- Good control test with no credentials: submit a bogus email/password on `index.html`. A red
  banner containing `INVALID_LOGIN_CREDENTIALS` proves the Firebase CDN + auth network path is
  actually working, so the redirects above are real guard decisions and not script load failures.
- **Console errors:** `location.replace` wipes the console before you can read it. Open DevTools
  (ctrl+shift+j), open the console settings gear, tick **Preserve log**, then navigate. A healthy
  run shows only `Navigated to .../stock.html` and `Navigated to .../index.html` with no errors.

## Devin Secrets Needed
- None available today, and none are required for the unauthenticated/guard path.
- To test the **signed-in** reveal path you need a Firebase email/password test account for project
  `assetguard-c8c8c` (e.g. `ASSETGUARD_TEST_EMAIL` / `ASSETGUARD_TEST_PASSWORD`). Without it, report
  the signed-in path as untested rather than self-registering an account.
- Live M-Pesa STK push needs real Daraja consumer key/secret/passkey — out of scope.
