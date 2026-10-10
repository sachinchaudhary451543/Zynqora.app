# Google sign-in setup and release checklist

## What is ready in the app

- Web sign-in uses Google's official Identity Services button and sends the ID token to the API for signature, audience, issuer, expiry, verified-email, and one-time nonce validation.
- Android uses Credential Manager through the Capacitor social-login plugin and requests a fresh server nonce for each sign-in.
- The API links an existing account only when Google supplies the same verified email. New accounts receive a one-time recovery code in the app.
- Google sign-in and the libraries used here do not charge per sign-in. Google Play developer registration has a separate fee.

Google Cloud project: **Zynqora** (`zynqora`, project number `813063188082`). The web OAuth client has been created as `Zynqora Web`; its public client ID is:

```text
813063188082-e58f38lav8fuh11bk79vslb6g27fv6uh.apps.googleusercontent.com
```

The Android debug OAuth client has also been created as `Zynqora Android Debug`, for package `com.zynqora.app` and this machine's debug signing key:

```text
Client ID: 813063188082-dol3vb4bj4o9a22d7tmeafajm604ejn6.apps.googleusercontent.com
Debug SHA-1: 71:A2:CC:F8:9B:B1:23:32:65:F1:7E:BF:30:A7:6A:C0:78:BA:2D:D3
```

This Android registration is debug-only. Add a separate Android OAuth client for the release certificate (and Play App Signing certificate for Play distribution) before release. Never send or store an OAuth client secret.

## Google Cloud configuration and release requirements

In the **Zynqora** project (`zynqora`, project number `813063188082`):

1. In **Google Auth Platform → Branding**, review the app name `Zynqora`, support email, and required developer contact email before launch.
2. Under **Audience**, choose **External** if users outside your organization will sign in. While the app is in **Testing**, add the Google accounts allowed to test it. Before a public launch, complete the publishing and verification steps shown by Google.
3. The **Web application** client `Zynqora Web` is already created. Its **Authorized JavaScript origins** are:
   - `https://zynqora.netlify.app` (the current live web-app origin)
   - `http://localhost:5173` (Vite development)
   - `http://localhost:4174` and `http://127.0.0.1:4174` (the local preview tab)
4. No redirect URI is needed for the current Google Identity Services button. The Web client ID is `813063188082-e58f38lav8fuh11bk79vslb6g27fv6uh.apps.googleusercontent.com`.
5. The debug Android client is registered in the same project with package name `com.zynqora.app` and the debug SHA-1 listed above. For release signing, create another Android client using the release certificate SHA-1. From PowerShell, check local signing fingerprints with:

   ```powershell
   Set-Location frontend\android
   .\gradlew.bat signingReport
   ```

   Register the release signing SHA-1 before distributing a directly signed build. For Play Store distribution, also register the **Play App Signing** certificate SHA-1 shown in Play Console. Keep all clients in the same Google Cloud project.

The Android app requests the Web client ID as its server client ID, and the API verifies the same audience. The Android client registration is still required for Google to recognize the Android package/signature. Do not put a private client secret in the app, environment files, documentation, or repository.

The app is currently in **Testing** status, and the Google account used to configure this project has been added as a test user. Other users must also be added until the app is published and any Google verification requirements are met.

## Configure the app and deploy

Set the exact same **Web client ID** in both environments:

- Frontend build environment: `VITE_GOOGLE_WEB_CLIENT_ID`
- Backend API environment: `GOOGLE_OAUTH_CLIENT_ID`

For the current hosts, set `VITE_GOOGLE_WEB_CLIENT_ID` in the Netlify site build environment and `GOOGLE_OAUTH_CLIENT_ID` in the Render API environment, then redeploy both. These values are public client identifiers, not secrets. The backend `CORS_ORIGIN` must include `https://zynqora.netlify.app`. For local preview against the deployed API, temporarily allow `http://127.0.0.1:4174` and/or `http://localhost:4174` in the API CORS configuration; remove the local origins after testing. The shared local preview currently gets a CORS preflight rejection from the deployed API, so OAuth cannot be tested there until CORS is configured.

For local development, put the public client ID in `frontend/.env`:

```dotenv
VITE_GOOGLE_WEB_CLIENT_ID=813063188082-e58f38lav8fuh11bk79vslb6g27fv6uh.apps.googleusercontent.com
```

Put the same audience in `backend/.env`:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=813063188082-e58f38lav8fuh11bk79vslb6g27fv6uh.apps.googleusercontent.com
```

Restart/rebuild the frontend after changing its `VITE_` variable. The Google sign-in button is intentionally hidden when that value is blank.

## Database rollout and build

The complete additive PostgreSQL schema change for this release (Google sign-in, refresh sessions, and circle features) is in [`backend/prisma/rollout/postgresql-application-upgrade.sql`](../backend/prisma/rollout/postgresql-application-upgrade.sql). It was generated from the production `main` schema, omits the generated index drop, and runs in a transaction. The production project is Supabase; confirm the selected project and schema preflight before running this script once in its SQL Editor. Do not run `prisma db push` or `prisma migrate deploy`: the repository's historical Prisma migration lock is SQLite-based and has not been reconciled with the PostgreSQL production database.

Then generate Prisma Client, build the backend, build the web app, and sync Android:

```powershell
Set-Location backend
npm run prisma:generate
npm run build

Set-Location ..\frontend
npm run mobile:sync
```

The local backend must be stopped before Prisma generation if it is holding the Windows query-engine DLL open. The Android project also pins AndroidX Browser to `1.4.0` to match Google Android Browser Helper's strict dependency constraint.

Open Android Studio with `npm run android:open` to create a release artifact and sign it with the release key. A debug APK is not Play Store ready. Test a new Google account (including the one-time recovery-code prompt), an existing account with the same verified email, a nonce-expired retry, and Android sign-in with debug and release signing certificates.
