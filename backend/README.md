# Backend upload & processing setup

This project supports two upload flows:

- S3 + presigned uploads (production): clients upload directly to S3 using presigned PUT URLs. The backend can process media and upload processed renditions back to S3.
- Local filesystem (development): files are saved to `backend/public/uploads` and served statically.

Prerequisites

- Node 18+
- `ffmpeg` installed on the host (for transcoding). On Windows, add ffmpeg to PATH. On macOS, `brew install ffmpeg`.
- AWS credentials and S3 bucket if using S3 flow.

Environment variables

Set these in your `.env`:

- `SERVER_BASE_URL` — e.g. `http://localhost:3000`
- `AWS_S3_BUCKET` — your S3 bucket name (optional; if missing local uploads are used)
- `AWS_REGION` — S3 region
- AWS credentials available via environment variables or IAM role: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

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
4. Backend downloads input (if inputUrl), runs `ffmpeg` to transcode/trim, and uploads processed file back to S3 under `processed/<outputKey>.mp4` (if S3 configured) and returns `publicUrl`.

Worker and scaling

- This repository includes `UploadsService.processMedia` which runs `ffmpeg` synchronously. For scale, run processing in background workers (ECS/Fargate/Lambda) triggered by S3 events or a queue (SQS / Redis Queue).

Notes

- For production, prefer presigned S3 uploads + background workers + CloudFront CDN.
- For client trimming UX, implement lightweight HTML5 range selection and send `trimStart`/`trimEnd` to the processing job. Client preview can be done with `URL.createObjectURL()`.
