# Railway backend deployment

Railway hosts the backend, Netlify hosts the frontend, and the existing Supabase
PostgreSQL project remains the application database.

## Create the service

1. Create a Railway project from the GitHub repository.
2. Set the backend `DATABASE_URL` to the existing Supabase PostgreSQL connection string. Preserve its current production data.
3. Configure the backend service root directory as `/` so Railway uses the repository-level `railway.json`.
4. Use the Dockerfile builder. The configuration points to `backend/Dockerfile`.
5. Generate a public domain for the backend service.

Do not configure `prisma db push` or `prisma migrate deploy` as a build or
pre-deploy command. Production uses Supabase PostgreSQL and the repository's
historical Prisma migrations are SQLite-based; deploy schema changes only using
the reviewed PostgreSQL rollout SQL when required.

## Backend variables

Set these variables on the backend service:

```text
NODE_ENV=production
DATABASE_URL=<existing Supabase PostgreSQL connection string>
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

## Persistent media storage with Supabase Storage

The `zynqora-media` public bucket is configured in the existing Supabase
project with a 15 MB object limit and the MIME types accepted by the API. Create
S3 access keys in Supabase Storage settings and add the two secret values to
Railway; keep them server-side and never commit them:

```text
AWS_S3_BUCKET=zynqora-media
AWS_REGION=<Supabase project region>
AWS_ACCESS_KEY_ID=<Supabase Storage S3 access key>
AWS_SECRET_ACCESS_KEY=<Supabase Storage S3 secret key>
S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
S3_PUBLIC_BASE_URL=https://<project-ref>.storage.supabase.co/storage/v1/object/public/zynqora-media
```

The API uploads through Supabase's S3-compatible endpoint and returns public
bucket URLs. Supabase S3 access keys have full access to all buckets and bypass
RLS; store them only in Railway's backend variables. Test a presigned upload
from the Netlify origin after configuring credentials. Do not run Prisma schema
pushes as part of this deployment.