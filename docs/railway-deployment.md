# Railway backend deployment

Use Railway for the backend when the Render service reaches its usage limit.
The frontend can remain on Netlify.

## Create the service

1. Create a Railway project from the GitHub repository.
2. Use the existing Supabase project as the database. Do not add a Railway PostgreSQL service.
3. Configure the backend service root directory as `/` so Railway uses the repository-level `railway.json`.
4. Use the Dockerfile builder. The configuration points to `backend/Dockerfile`.
5. Generate a public domain for the backend service.

Remove any manually configured build command containing `prisma db push`. The
repository configuration runs that command only after the image is built and
the database variables are available.

## Backend variables

Set these variables on the backend service:

```text
NODE_ENV=production
DATABASE_URL=<Supabase PostgreSQL connection string>
JWT_SECRET=<at least 32 random characters>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://zynqora.netlify.app
SERVER_BASE_URL=https://<railway-backend-domain>
```

Railway supplies `PORT` automatically. Do not hard-code it in the service settings.
Copy `DATABASE_URL` from Supabase Dashboard -> Connect. Use the Supabase
connection type recommended for Prisma, and keep the full query parameters such
as `sslmode=require` or `pgbouncer=true` when Supabase provides them. Do not use
the `${{Postgres.DATABASE_URL}}` reference because this project uses Supabase.
Optional variables such as `SENTRY_DSN`, SMTP, S3, and realtime provider settings
can be added when those integrations are configured.

## Netlify variable

In the Netlify site environment variables, set:

```text
VITE_API_BASE=https://<railway-backend-domain>/api
```

Trigger a new Netlify deploy after changing this variable. Verify the backend at:

```text
https://<railway-backend-domain>/api/health
```

Media stored in `backend/public/uploads` is ephemeral on Railway. Configure the
S3-compatible variables before relying on persistent uploads.