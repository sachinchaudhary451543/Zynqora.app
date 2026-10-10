import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { UploadsService } from './uploads.service';

describe('UploadsService AI remaster', () => {
  const originalFetch = globalThis.fetch;
  const originalStorageEnvironment = {
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
  };
  let tempUploadsDir: string | undefined;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalStorageEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (tempUploadsDir) rmSync(tempUploadsDir, { recursive: true, force: true });
    tempUploadsDir = undefined;
  });

  it('generates an image from the supplied prompt and saves the provider result', async () => {
    for (const key of Object.keys(originalStorageEnvironment)) delete process.env[key];
    let requestedUrl = '';
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(Buffer.alloc(1400, 2), { status: 200, headers: { 'content-type': 'image/png' } });
    }) as typeof fetch;

    const service = new UploadsService();
    tempUploadsDir = mkdtempSync(join(tmpdir(), 'zynqora-ai-generate-'));
    service['uploadsDir'] = tempUploadsDir;

    const result = await service.generateRealisticAi('A friendly robot in a garden', 'cosmic', 42, 'neutral');

    const requestUrl = new URL(requestedUrl);
    assert.equal(requestUrl.hostname, 'image.pollinations.ai');
    assert.equal(requestUrl.searchParams.get('seed'), '42');
    assert.equal(requestUrl.searchParams.get('private'), 'true');
    assert.match(decodeURIComponent(requestUrl.pathname), /A friendly robot in a garden/);
    assert.equal(readFileSync(join(tempUploadsDir, result.key!)).length, 1400);
    assert.equal(result.prompt?.includes('A friendly robot in a garden'), true);
  });

  it('passes the selected photo to image-to-image generation and stores its output', async () => {
    for (const key of Object.keys(originalStorageEnvironment)) delete process.env[key];
    const photoKey = 'portrait.jpg';
    const photoUrl = `http://localhost:3000/uploads/${photoKey}`;
    const imageRequests: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      imageRequests.push(url);
      return new Response(Buffer.alloc(1400, 1), { status: 200, headers: { 'content-type': 'image/png' } });
    }) as typeof fetch;

    const service = new UploadsService();
    tempUploadsDir = mkdtempSync(join(tmpdir(), 'zynqora-ai-remaster-'));
    service['uploadsDir'] = tempUploadsDir;
    writeFileSync(join(tempUploadsDir, photoKey), Buffer.alloc(1200));

    const result = await service.modifyImageWithAi({
      imageUrl: photoUrl,
      prompt: 'Add warm studio lighting',
      style: 'studio',
      gender: 'neutral',
    });

    assert.equal(imageRequests.length, 1);
    const remasterRequest = new URL(imageRequests[0]);
    assert.match(remasterRequest.searchParams.get('image') || '', /^data:image\/jpeg;base64,/);
    assert.equal(remasterRequest.searchParams.get('private'), 'true');
    assert.match(decodeURIComponent(remasterRequest.pathname), /preserve the identity/);
    assert.equal(readFileSync(join(tempUploadsDir, result.key!)).length, 1400);
    assert.equal(result.prompt?.includes('Add warm studio lighting'), true);
  });

  it('builds encoded public URLs for objects in Supabase Storage', () => {
    process.env.AWS_S3_BUCKET = 'zynqora-media';
    process.env.S3_ENDPOINT = 'https://project-ref.storage.supabase.co/storage/v1/s3';
    process.env.S3_PUBLIC_BASE_URL = 'https://project-ref.storage.supabase.co/storage/v1/object/public/zynqora-media/';
    const service = new UploadsService();

    assert.equal(
      service['s3PublicUrl']('zynqora-media', 'profile photos/creator one.png'),
      'https://project-ref.storage.supabase.co/storage/v1/object/public/zynqora-media/profile%20photos/creator%20one.png',
    );
  });

  it('presigns direct uploads against the configured Supabase S3 endpoint', async () => {
    process.env.AWS_S3_BUCKET = 'zynqora-media';
    process.env.AWS_REGION = 'ap-southeast-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.S3_ENDPOINT = 'https://project-ref.storage.supabase.co/storage/v1/s3';
    process.env.S3_PUBLIC_BASE_URL = 'https://project-ref.storage.supabase.co/storage/v1/object/public/zynqora-media';
    const service = new UploadsService();

    const result = await service.presign('profile photo.png', 'image/png');

    assert.equal(result.method, 'PUT');
    assert.equal(new URL(result.uploadUrl).hostname, 'project-ref.storage.supabase.co');
    assert.match(new URL(result.uploadUrl).pathname, /\/storage\/v1\/s3\/zynqora-media\//);
    assert.match(result.publicUrl, /\/object\/public\/zynqora-media\//);
  });

  it('rejects a custom S3 endpoint without a public object URL', () => {
    process.env.AWS_S3_BUCKET = 'zynqora-media';
    process.env.S3_ENDPOINT = 'https://project-ref.storage.supabase.co/storage/v1/s3';
    delete process.env.S3_PUBLIC_BASE_URL;
    const service = new UploadsService();

    assert.throws(() => service.usingS3(), /S3_PUBLIC_BASE_URL is required/);
  });

  it('requires a source photo instead of silently generating an unrelated image', async () => {
    const service = new UploadsService();
    await assert.rejects(
      service.modifyImageWithAi({ prompt: 'Add studio lighting' }),
      /Choose a photo/,
    );
  });
});
