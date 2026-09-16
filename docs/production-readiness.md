# Production Readiness

## Current architecture

- Frontend: React + Vite + TypeScript in `frontend/` with lazy-loaded routes and a context-based auth provider.
- Backend: NestJS + TypeScript in `backend/` with Prisma ORM, JWT auth, Socket.IO realtime gateway, and upload/media modules.
- Database: PostgreSQL via Prisma schema in `backend/prisma/schema.prisma`.
- Deployment: Netlify static frontend, Render managed backend, Docker Compose for local Postgres.
- Mobile: Capacitor Android wrapper is generated, security-hardened, and builds a debug APK; push/camera device workflows are not yet complete.

## Current build/test status

- Baseline build: backend `npm run build` succeeded.
- Baseline build: frontend `npm run build` succeeded.
- Baseline test coverage: no meaningful automated test suite existed before this phase.
- Observed risk: runtime config relied on unsafe fallback secrets and permissive CORS defaults.

## Confirmed bugs

- JWT signing used a weak fallback secret (`dev-secret-change-me`) in production.
- Runtime config was not validated at startup.
- Auth-sensitive endpoints had no rate limiting.
- `process.env` was trusted without validating required variables.

## Suspected performance problems

- The HLS playback library remains a large on-demand chunk; it is now excluded from initial route payloads.
- The upload pipeline does synchronous media processing and ffmpeg work in the request path.
- Stories and relationship lists still use bounded array responses and need coordinated frontend cursor pagination.

## Security risks

- Missing production-grade runtime environment validation.
- Token expiry defaults and signing secrets were not enforced.
- Public CORS was permissive in local/dev mode and not explicitly constrained in prod.
- JWTs were not revocable after password reset; existing sessions could remain valid until expiry.

## Missing features

- Refresh-token rotation and explicit logout/session revocation remain incomplete.
- Account deletion and verification flows.
- Full pagination and indexes for large feeds/chats.
- Real push notifications and call provider abstraction.
- Background media processing workers and production object storage queueing.

## Database and deployment risks

- Prisma schema has no multi-column indexes for common access patterns beyond basic fields.
- Production deployments depend on external Postgres + secret config and need explicit validation.
- Render startup uses `npx ts-node src/main.ts` without a production build runtime hardening pass.

## Prioritized implementation plan

1. Harden runtime config and auth secrets.
2. Add auth throttling and keep JWT configuration explicit.
3. Expand automated tests for config/auth validation.
4. Continue on Phase 1 and subsequent production-hardening stages, verifying after each phase.

## Verification results after each phase

### Phase 0 baseline

- Verified project structure and key modules.
- Confirmed backend and frontend builds both succeed on the current branch.
- Created the initial runtime config regression tests to guard against weak production secrets.

### Phase 1 (security/auth) - in progress

- Added runtime config validation.
- Required stronger JWT secrets for production.
- Added auth rate limiting for password-sensitive endpoints.
- Added per-user JWT token versions and invalidate all existing sessions after password reset.
- Added explicit logout flow that invalidates the current session by incrementing the user's token version.
- Added authenticated account deletion with transactional cleanup of owned content, social edges, notifications, and conversation membership.
- Added a confirmed account deletion action to the Settings page that clears the local session after successful deletion.
- Updated Render to start the compiled backend through `npm start` instead of `ts-node`.
- Added DTO-backed type and length validation for chat messages and story creation, closing raw-body validation gaps.
- Redacted raw database errors from readiness responses while preserving server-side Nest diagnostics.
- Standardized backend startup and failure logging through Nest Logger.
- Added request correlation and structured completion logs with request ID, method, path, status, and duration; query strings and bodies are excluded.
- Added a root frontend error boundary with a recoverable reload screen for render-time failures.
- Enabled Helmet response security headers while allowing cross-origin backend media delivery.
- Added realtime identity and room authorization checks with regression coverage.
- Restricted chat message sender data to public profile fields; private User fields are no longer serialized.
- Disabled automatic redirects for remote media fetches to preserve SSRF URL validation.
- Bounded high-growth chat, story, comment, like, follower, and following reads while preserving existing response shapes.
- Kept comment and like totals accurate with separate count queries.
- Corrected shared cursor pagination to skip the cursor row and prevent duplicate records across pages.
- Added upload safety regression coverage for MIME validation, path traversal, and private-network URL rejection.
- Re-ran validation checks after the fix.

### Latest verification

- Backend build succeeded after token-version changes.
- Prisma schema validation succeeded.
- Focused backend regression suite passed: 6 tests, 0 failures.
- Touched auth and schema files report no editor diagnostics.
- Chat and upload services build successfully with no editor diagnostics.
- Regression suite and backend build remain green after query-bound changes.
- Pagination regression coverage confirms cursor pages do not repeat their boundary record.
- Upload safety suite passes alongside the existing backend tests: 11 tests, 0 failures.
- Frontend typecheck and production build passed after media code splitting.
- Auth logout flow compiles cleanly in the frontend and backend, and the new regression suite passes: 12 tests, 0 failures.
- Account deletion regression coverage passes: 13 backend tests, 0 failures; frontend typecheck and production build also pass.
- Render configuration now uses the existing compiled-runtime launcher after a successful backend build.
- Content input validation regression coverage passes: 15 backend tests, 0 failures; frontend typecheck remains green.
- Operational readiness regression coverage passes: 16 backend tests, 0 failures; backend production build succeeds.
- Request telemetry compiles cleanly and exposes `X-Request-Id` for deployment-side incident tracing.
- Frontend error-boundary integration passes typecheck and production build validation.
- Helmet integration passes backend build and the 16-test focused regression suite. `npm install` reports 29 dependency audit findings requiring a separate, reviewed upgrade pass.
- StoryRecorder reduced from 621.2 kB to 10.7 kB; StoryViewerModal reduced from 610.5 kB to 6.1 kB; PostCard reduced from 604.5 kB to 10.8 kB.
- HLS playback is isolated in a 594.8 kB on-demand chunk.
- Added frontend API helper coverage: 3 tests passed; frontend typecheck passed.
- Production monitoring is configured through `SENTRY_DSN` / `VITE_SENTRY_DSN` with startup guards that fail fast in production when the DSN is missing.
- Refresh-token rotation is implemented and validated with 18 passing auth regression tests.

### Phase 3 (mobile packaging)

- Confirmed the app already has a Capacitor config shell in place and a web build artifact can be packaged for native wrappers.
- Added the Capacitor Android runtime and package scripts required to initialize and sync the native project.
- Generated the Android project and verified the native wrapper sync completed successfully.

### Phase 4 (mobile security hardening)

- Restricted the Android wrapper to HTTPS-only network access by disabling cleartext traffic in the Capacitor config and Android manifest.
- Added the standard mobile permissions needed for camera capture and Android 13+ notification delivery without enabling extra device access beyond current app requirements.
- Added native-only runtime permission bootstrap for camera and push notifications.
- Added authenticated native push-token registration, deduplication, and logout removal backed by a persisted device-token table.
- Installed the Android SDK/JDK toolchain and validated the native wrapper with a successful `assembleDebug` build.
- Verified debug APK output at `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
- Rebuilt the APK after push integration; no emulator or physical device is currently available (`adb devices` is empty), so runtime device validation remains pending.
- Remaining mobile work is Firebase/APNs provider configuration, production push delivery wiring, and camera workflow testing on a real device or emulator.

### Phase 2 (dependency hardening)

- Reviewed the remaining `npm audit` findings and confirmed they are caused by vulnerable transitive packages (`multer`, `qs`, `tar`) pulled in through the NestJS upload stack and dependency tree.
- Added package overrides in the backend manifest to force patched library versions without jumping to a major NestJS upgrade that would risk the production deployment path.
- Reinstalled dependencies and re-ran the security and build checks to verify the package tree remains green and the app still builds cleanly.
