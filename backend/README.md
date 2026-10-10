# Backend upload & processing setup

This project supports two upload flows:

- S3-compatible storage + presigned uploads (production): clients upload directly to S3-compatible storage using presigned PUT URLs. This supports AWS S3 and Supabase Storage.
- Local filesystem (development): files are saved to `backend/public/uploads` and served statically.

Prerequisites

- Node 18+
- `ffmpeg` installed on the host (for transcoding). On Windows, add ffmpeg to PATH. On macOS, `brew install ffmpeg`.
- AWS-compatible credentials and a bucket if using S3 flow.

Environment variables

Set these in your `.env`:

- `SERVER_BASE_URL` — e.g. `http://localhost:3000`
- `AWS_S3_BUCKET` — S3 bucket name (optional in development; required for persistent production uploads)
- `AWS_REGION` — S3 region; use the Supabase project's region with Supabase Storage
- AWS credentials available via environment variables or IAM role: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` — optional custom S3 API endpoint, such as Supabase Storage's `/storage/v1/s3`
- `S3_PUBLIC_BASE_URL` — public bucket URL prefix required with a custom S3 endpoint

Supabase S3 access keys are server-only and have project-wide storage access.
Never expose them to the frontend or commit them to the repository.

Install dependencies (backend)

```bash
cd backend
npm install
```

Run backend (dev)

```bash
npm run start:dev
```

Processing flow (example)

1. Client requests presigned URL: `POST /api/uploads/presign` with `{ filename, contentType }`.
2. Client uploads file directly to `uploadUrl` (PUT) or posts to `/api/uploads/local` for local dev.
3. After upload, client calls `POST /api/uploads/process` with `{ inputUrl, outputKey, trimStart, trimEnd }`.
4. Backend downloads input (if inputUrl), runs `ffmpeg` to transcode/trim, and uploads processed file back to S3-compatible storage under `processed/<outputKey>.mp4` (if configured) and returns `publicUrl`.

Worker and scaling

- This repository includes `UploadsService.processMedia` which runs `ffmpeg` synchronously. For scale, run processing in background workers (ECS/Fargate/Lambda) triggered by S3 events or a queue (SQS / Redis Queue).

Notes

- For production, prefer presigned S3 uploads + background workers + CloudFront CDN.
- For client trimming UX, implement lightweight HTML5 range selection and send `trimStart`/`trimEnd` to the processing job. Client preview can be done with `URL.createObjectURL()`.
