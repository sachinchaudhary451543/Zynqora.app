import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { UploadsService } from './uploads.service';

describe('UploadsService AI remaster', () => {
  const originalFetch = globalThis.fetch;
  const originalBucket = process.env.AWS_S3_BUCKET;
  let tempUploadsDir: string | undefined;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalBucket === undefined) delete process.env.AWS_S3_BUCKET;
    else process.env.AWS_S3_BUCKET = originalBucket;
    if (tempUploadsDir) rmSync(tempUploadsDir, { recursive: true, force: true });
    tempUploadsDir = undefined;
  });

  it('passes the selected photo to image-to-image generation and stores its output', async () => {
    delete process.env.AWS_S3_BUCKET;
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

  it('requires a source photo instead of silently generating an unrelated image', async () => {
    const service = new UploadsService();
    await assert.rejects(
      service.modifyImageWithAi({ prompt: 'Add studio lighting' }),
      /Choose a photo/,
    );
  });
});
