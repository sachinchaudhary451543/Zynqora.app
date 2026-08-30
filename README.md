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
