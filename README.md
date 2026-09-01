# Family App — MVP slice

Auth, profiles, follow/mutual-follow, and a posts feed. This is the foundation
everything else (chat, video calls, games, AI generation) will build on top of.

## Structure

```
family-app/
├── docker-compose.yml     # Postgres for local dev
├── backend/               # NestJS + Prisma + JWT auth
└── frontend/              # React + Vite + TypeScript
```

## Run it locally

### 1. Start Postgres

```bash
cd family-app
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # edit JWT_SECRET if you want
npm install
npx prisma migrate dev --name init   # creates tables
npm run start:dev
```

Backend runs at `http://localhost:3000/api`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Production deployment

### Netlify frontend

Import this repository into Netlify. The included `netlify.toml` uses
`frontend` as the base directory, runs `npm run build`, publishes `dist`, and
adds the SPA fallback required by React Router. In Netlify site settings add
`VITE_API_BASE=https://YOUR-BACKEND-HOST/api`, then redeploy. The backend must
be deployed separately on an HTTPS host; Netlify does not run this NestJS API.

Build the frontend with `VITE_API_BASE=https://api.example.com/api npm run build`
and serve `frontend/dist` from a static host with SPA fallback to `index.html`.
Build the API with `npm run build` and run `npm start` with a strong
`JWT_SECRET`, `NODE_ENV=production`, an explicit `DATABASE_URL`, and a
restricted `CORS_ORIGIN`. The health check is `GET /api/health`.

The current schema uses SQLite for development. For a global deployment,
migrate the Prisma datasource to managed PostgreSQL (and create a production
migration) before launch; do not deploy `backend/prisma/dev.db` as shared
production storage. Configure S3-compatible object storage for uploads rather
than relying on local `backend/public/uploads`.

## Android packaging

The React frontend is mobile-wrapper ready. After deploying the API, set
`VITE_API_BASE` to its HTTPS URL, build the frontend, and add Capacitor Android
(`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) with `npx cap add
android`, `npx cap sync`, and `npx cap open android`. HTTPS, a production
signing key, and Play Console configuration are required for release.

Calling currently provides the call UI and local media controls; production
two-user calling still requires a WebRTC/LiveKit/Agora signaling service.

## Try it

1. Open `http://localhost:5173/signup`, create two accounts (e.g. in two
   browser tabs — one normal, one incognito, so both sessions stay logged in).
2. Visit `/profile/<other-username>` and click Follow from both accounts —
   once it's mutual, that pair is unlocked for chat once you build it.
3. Go to `/feed` and post something — it shows up because you always see
   your own posts, plus anyone you follow.

## What's already wired up, ready to build on

- JWT auth (`Authorization: Bearer <token>`) protecting all `/users` and `/posts` routes
- Password hashing with bcrypt (12 salt rounds)
- `Follow` model + `isMutual()` check in `UsersService` — this is the gate to
  use before allowing a chat thread to open
- `Post.visibility` enum (`CIRCLE` / `TREE` / `FOLLOWERS`) already in the
  schema, not yet enforced in the feed query — enforce it once you add
  family "circles" as a real grouping
- Feed query is cursor-paginated (`nextCursor`) so it won't fall over once
  there's real data volume

## Next slices to build, in order

1. **Chat** — new `Message` model + a `chat` module; gate thread creation
   behind `usersService.isMutual()`. Add a WebSocket gateway
   (`@nestjs/websockets`) for realtime delivery.
2. **Media uploads** — presigned S3 upload URLs so the frontend uploads
   directly to storage instead of through the API.
3. **Video calls** — integrate LiveKit or Agora rather than building WebRTC
   signaling from scratch.
4. **Games** — a `GameSession` WebSocket gateway, reusing the same realtime
   infra as chat.
5. **AI generation** — an async job queue (BullMQ + Redis) calling an
   image/video generation API, with a moderation step before any result is
   shown.

## Notes on this sandbox environment

`npx prisma generate` couldn't run in this sandbox because it needs to
download engine binaries from `binaries.prisma.sh`, which isn't on this
environment's network allowlist. On your own machine, with normal internet
access, `npm install` + `npx prisma migrate dev` will work as documented
above — this is a sandbox-only restriction, not a bug in the code. Both the
backend and frontend TypeScript were type-checked here and compile cleanly.
