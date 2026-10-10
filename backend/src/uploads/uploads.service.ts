import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import {
  assertAllowedUploadMime,
  assertSafeRemoteUrl,
  MAX_UPLOAD_BYTES,
  safeUploadPath,
  sanitizeUploadName,
} from './upload-safety';

const logger = new Logger('UploadsService');
const MAX_INLINE_IMAGE_BYTES = 1024 * 1024;

@Injectable()
export class UploadsService {
  private uploadsDir = join(process.cwd(), 'public', 'uploads');

  constructor() {
    try {
      mkdirSync(this.uploadsDir, { recursive: true });
    } catch (e) {
      logger.warn('Could not create uploads dir: ' + e.message);
    }
  }

  usingS3(): boolean {
    return !!process.env.AWS_S3_BUCKET;
  }

  getUploadsDir() {
    return this.uploadsDir;
  }

  async presign(filename: string, contentType: string) {
    assertAllowedUploadMime(contentType);
    const key = `${Date.now()}-${randomUUID()}-${sanitizeUploadName(filename)}`;

    if (this.usingS3()) {
      try {
        // dynamic import to avoid hard dependency when not configured
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const client = new S3Client({ region: process.env.AWS_REGION });
        const bucket = process.env.AWS_S3_BUCKET;
        const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
        const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 3600 });
        const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        return { uploadUrl, key, publicUrl, method: 'PUT' };
      } catch (e) {
        logger.warn('S3 presign failed, falling back to local: ' + e.message);
      }
    }

    // local fallback: client should POST to /uploads/local with form-data
    const uploadUrl = `/uploads/local`;
    const serverBase = process.env.SERVER_BASE_URL ?? 'http://localhost:3000';
    const publicUrl = `${serverBase}/uploads/${key}`; // served statically
    return { uploadUrl, key, publicUrl, method: 'POST' };
  }

  localPathForKey(key: string) {
    return safeUploadPath(this.uploadsDir, key);
  }

  resolveLocalPublicPath(key: string) {
    return this.localPathForKey(key);
  }

  async processMedia(options: { inputUrl?: string; inputKey?: string; outputKey: string; trimStart?: number; trimEnd?: number; type?: 'video' | 'image' }) {
    if (!options.inputUrl && !options.inputKey) {
      throw new BadRequestException('Media input is required');
    }
    if (!options.outputKey) {
      throw new BadRequestException('Output key is required');
    }

    const tmpIn = join(this.uploadsDir, `tmp-in-${randomUUID()}`);
    const outputKey = `${sanitizeUploadName(options.outputKey)}.mp4`;
    const tmpOut = this.localPathForKey(outputKey);
    try {
      if (options.inputUrl) {
        const buffer = await this.fetchRemoteBuffer(options.inputUrl);
        writeFileSync(tmpIn, buffer);
      } else if (options.inputKey) {
        const src = this.localPathForKey(options.inputKey);
        if (!existsSync(src)) throw new BadRequestException('Input file not found');
        writeFileSync(tmpIn, Buffer.from(readFileSync(src)));
      }

      // build ffmpeg args
      const args: string[] = ['-y', '-i', tmpIn];
      if (options.trimStart !== undefined) {
        args.unshift('-ss', String(options.trimStart));
      }
      if (options.trimEnd !== undefined) {
        const duration = Math.max(0, (options.trimEnd || 0) - (options.trimStart || 0));
        args.push('-t', String(duration));
      }
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', tmpOut);

      const { spawn } = require('child_process');
      await new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
        proc.on('close', (code: number) => {
          if (code === 0) resolve(true);
          else reject(new Error('ffmpeg failed ' + code));
        });
      });

      // If S3 configured, upload processed file back to S3 and return public URL
      if (this.usingS3()) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
          const client = new S3Client({ region: process.env.AWS_REGION });
          const bucket = process.env.AWS_S3_BUCKET;
          const outBuffer = require('fs').readFileSync(tmpOut);
          const outKey = `processed/${outputKey}`;
          const cmd = new PutObjectCommand({ Bucket: bucket, Key: outKey, Body: outBuffer, ContentType: 'video/mp4' });
          await client.send(cmd);
          const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${outKey}`;
          return { processedPath: tmpOut, publicUrl, key: outKey };
        } catch (e) {
          logger.warn('upload processed to S3 failed: ' + e.message);
          return { processedPath: tmpOut };
        }
      }

      return { processedPath: tmpOut, publicUrl: this.publicUrlForKey(outputKey), key: outputKey };
    } catch (e) {
      logger.error('processMedia error: ' + e.message);
      throw e;
    } finally {
      if (existsSync(tmpIn)) unlinkSync(tmpIn);
    }
  }

  async fetchRemoteAndSave(url: string) {
    try {
      const { buffer, contentType } = await this.fetchRemoteBufferWithType(url);
      assertAllowedUploadMime(contentType);
      return await this.saveImageBuffer(buffer, contentType);
    } catch (e) {
      logger.error('fetchRemoteAndSave error: ' + e.message);
      throw e;
    }
  }

  async generateRealisticAi(prompt?: string, style?: string, seed?: number, gender?: string) {
    const rawSeed = seed || Math.floor(Math.random() * 1000000);
    
    // Determine subject gender/persona
    let genderPrefix = 'portrait of handsome male software engineer, ';
    if (gender === 'female') {
      genderPrefix = 'portrait of beautiful female creator, ';
    } else if (gender === 'neutral') {
      genderPrefix = 'portrait of young visionary creator, ';
    } else if (gender === 'cyborg') {
      genderPrefix = 'portrait of futuristic cyberpunk male cyborg with glowing cybernetic implants, ';
    } else if (gender === 'male') {
      genderPrefix = 'portrait of handsome young male technologist, ';
    }

    // Base user prompt
    const userPrompt = (prompt || 'modern software engineer in high-tech obsidian laboratory with subtle neon cyan aura lighting').trim();

    // Style Enhancement Prompt Wrappers
    let stylePrefix = '';
    let styleSuffix = ', cinematic 8k, photorealistic, ultra-sharp focus, volumetric ambient lighting, masterpiece';

    switch (style) {
      case 'cyberpunk':
        stylePrefix = 'Cyberpunk neon aesthetic, holographic reflections, obsidian tech hub, ';
        styleSuffix = ', neon cyan and violet glow, octane render, 8k, hyperdetailed';
        break;
      case 'anime':
        stylePrefix = '3D anime digital art, vibrant Makoto Shinkai aesthetic, ';
        styleSuffix = ', clean line art, trending on artstation, masterpiece, 4k';
        break;
      case 'cosmic':
        stylePrefix = 'Ethereal celestial aura, glowing stardust particles, cosmic nebula backdrop, ';
        styleSuffix = ', glowing violet and cyan nebula, transcendent lighting, 8k';
        break;
      case 'studio':
        stylePrefix = 'Professional minimalist studio headshot, softbox lighting, clean dark background, ';
        styleSuffix = ', shot on 85mm f1.4 lens, natural skin texture, award winning photography';
        break;
      case 'solar':
        stylePrefix = 'Sun-drenched golden hour portrait, warm lens flare, amber rim lighting, ';
        styleSuffix = ', high dynamic range, breathtaking detail, 8k';
        break;
      default:
        stylePrefix = 'Photorealistic, ';
        break;
    }

    // Build enhanced prompt
    const finalPromptText = `${stylePrefix}${genderPrefix}${userPrompt}${styleSuffix}`;
    const fullPrompt = encodeURIComponent(finalPromptText);
    const aiEngineUrl = `https://image.pollinations.ai/prompt/${fullPrompt}?width=768&height=768&seed=${rawSeed}&nologo=true`;

    logger.log(`Generating AI image: seed=${rawSeed}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      try {
        const res = await fetch(aiEngineUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        if (!res.ok) throw new Error(`AI engine returned status ${res.status}`);
        const generatedContentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].toLowerCase();
        if (!generatedContentType.startsWith('image/')) throw new Error('AI engine returned a non-image response');
        assertAllowedUploadMime(generatedContentType);
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length <= 500 || buffer.length > MAX_UPLOAD_BYTES) {
          throw new Error('AI engine returned an invalid image size');
        }
        const saved = await this.saveImageBuffer(buffer, generatedContentType);
        return { ...saved, prompt: finalPromptText, style, gender };
      } finally {
        clearTimeout(timeout);
      }
    } catch (e: any) {
      logger.warn(`Pollinations generator failed: ${e.message}`);
      throw new ServiceUnavailableException('AI image generation is temporarily unavailable. Please try again.');
    }
  }

  async modifyImageWithAi(options: { imageUrl?: string; prompt: string; style?: string; gender?: string }) {
    if (!options.imageUrl) throw new BadRequestException('Choose a photo before starting an AI remaster.');
    const userPrompt = options.prompt || 'Remaster with cinematic volumetric lighting, neon aura, and ultra-sharp 8k details';
    logger.log(`Modifying image with AI: prompt="${userPrompt}", style="${options.style || 'auto'}", gender="${options.gender || 'male'}"`);

    let imageUrl: string;
    try {
      imageUrl = new URL(options.imageUrl, process.env.SERVER_BASE_URL ?? 'http://localhost:3000').toString();
    } catch {
      throw new BadRequestException('The selected photo URL is invalid.');
    }
    const localImageKey = this.getLocalUploadKey(imageUrl);
    let contentType: string;
    let buffer: Buffer;
    if (localImageKey) {
      const localPath = this.localPathForKey(localImageKey);
      if (!existsSync(localPath)) throw new BadRequestException('The selected photo could not be found.');
      buffer = readFileSync(localPath);
      contentType = this.contentTypeForFilename(localImageKey);
    } else {
      assertSafeRemoteUrl(imageUrl);
      ({ contentType, buffer } = await this.fetchRemoteBufferWithType(imageUrl));
    }
    if (!contentType.startsWith('image/')) throw new BadRequestException('The selected photo URL is not an image.');
    assertAllowedUploadMime(contentType);
    if (buffer.length > MAX_UPLOAD_BYTES) throw new BadRequestException('The selected photo exceeds the maximum size.');
    const source = new URL(imageUrl);
    const server = new URL(process.env.SERVER_BASE_URL ?? 'http://localhost:3000');
    const imageReference = source.origin === server.origin && ['localhost', '127.0.0.1', '::1'].includes(source.hostname.replace(/^\[|\]$/g, ''))
      ? this.localImageDataUrl(buffer, contentType)
      : imageUrl;

    const prompt = `${userPrompt.trim()}${options.style ? `, ${options.style} visual style` : ''}${options.gender ? `, subject presentation: ${options.gender}` : ''}, preserve the identity and recognizable facial features of the reference photo`;
    const query = new URLSearchParams({
      image: imageReference,
      width: '768',
      height: '768',
      nologo: 'true',
      private: 'true',
      seed: String(Math.floor(Math.random() * 1000000)),
    });
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${query.toString()}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`AI engine returned status ${response.status}`);
        const outputType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
        if (!outputType.startsWith('image/')) throw new Error('AI engine returned a non-image response');
        const output = Buffer.from(await response.arrayBuffer());
        if (output.length <= 500 || output.length > MAX_UPLOAD_BYTES) throw new Error('AI engine returned an invalid image size');
        const saved = await this.saveImageBuffer(output, outputType);
        return { ...saved, prompt, style: options.style, gender: options.gender };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      logger.warn(`Pollinations image remaster failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new ServiceUnavailableException('AI photo remastering is temporarily unavailable. Please try again.');
    }
  }

  async generateAi(seed?: string) {
    return this.generateRealisticAi(seed ? `Photorealistic creator avatar named ${seed}` : undefined);
  }

  private async fetchRemoteBuffer(url: string) {
    return (await this.fetchRemoteBufferWithType(url)).buffer;
  }

  private async fetchRemoteBufferWithType(url: string) {
    assertSafeRemoteUrl(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
      if (res.status >= 300 && res.status < 400) {
        throw new BadRequestException('Remote redirects are not allowed');
      }
      if (!res.ok) throw new BadRequestException('Remote file could not be fetched');

      const contentLength = Number(res.headers.get('content-length') || 0);
      if (contentLength > MAX_UPLOAD_BYTES) throw new BadRequestException('Remote file is too large');

      const contentType = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].toLowerCase();
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > MAX_UPLOAD_BYTES) throw new BadRequestException('Remote file is too large');
      return { buffer, contentType };
    } finally {
      clearTimeout(timeout);
    }
  }

  private extensionForContentType(contentType: string) {
    if (contentType.includes('svg')) return 'svg';
    if (contentType.includes('jpeg')) return 'jpg';
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('gif')) return 'gif';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('mp4')) return 'mp4';
    if (contentType.includes('webm')) return 'webm';
    if (contentType.includes('quicktime')) return 'mov';
    return extname(contentType) || 'jpg';
  }

  private contentTypeForFilename(filename: string) {
    const extension = extname(filename).toLowerCase();
    const types: Record<string, string> = {
      '.gif': 'image/gif',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    };
    const contentType = types[extension];
    if (!contentType) throw new BadRequestException('The selected photo has an unsupported image format.');
    return contentType;
  }

  private getLocalUploadKey(imageUrl: string) {
    const base = new URL(process.env.SERVER_BASE_URL ?? 'http://localhost:3000');
    const source = new URL(imageUrl);
    if (source.origin !== base.origin || !source.pathname.startsWith('/uploads/')) return null;
    try {
      return decodeURIComponent(source.pathname.slice('/uploads/'.length));
    } catch {
      throw new BadRequestException('The selected photo URL is invalid.');
    }
  }

  private localImageDataUrl(buffer: Buffer, contentType: string) {
    if (buffer.length > MAX_INLINE_IMAGE_BYTES) {
      throw new BadRequestException('For local remastering, use an image smaller than 1 MB or test with the deployed app.');
    }
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  private async saveImageBuffer(buffer: Buffer, contentType: string) {
    assertAllowedUploadMime(contentType);
    if (buffer.length > MAX_UPLOAD_BYTES) throw new BadRequestException('Image file is too large');
    const key = `${Date.now()}-${randomUUID()}.${this.extensionForContentType(contentType)}`;

    if (this.usingS3()) {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const client = new S3Client({ region: process.env.AWS_REGION });
      const bucket = process.env.AWS_S3_BUCKET;
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }));
      return {
        key,
        publicUrl: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      };
    }

    writeFileSync(this.localPathForKey(key), buffer);
    return { key, publicUrl: this.publicUrlForKey(key) };
  }

  private publicUrlForKey(key: string) {
    const serverBase = process.env.SERVER_BASE_URL ?? 'http://localhost:3000';
    return `${serverBase}/uploads/${key}`;
  }
}
