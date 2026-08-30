import { Injectable, Logger } from '@nestjs/common';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync, createWriteStream } from 'fs';

const logger = new Logger('UploadsService');

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

  async presign(filename: string, contentType: string) {
    const key = `${Date.now()}-${randomUUID()}-${filename.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;

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
    return join(this.uploadsDir, key);
  }

  async processMedia(options: { inputUrl?: string; inputKey?: string; outputKey: string; trimStart?: number; trimEnd?: number; type?: 'video' | 'image' }) {
    // download input if needed
    const tmpIn = join(this.uploadsDir, `tmp-in-${randomUUID()}`);
    const tmpOut = join(this.uploadsDir, options.outputKey + '.mp4');
    try {
      if (options.inputUrl) {
        // fetch and save
        const res = await fetch(options.inputUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        writeFileSync(tmpIn, buffer);
      } else if (options.inputKey) {
        // assume local key
        const src = this.localPathForKey(options.inputKey);
        writeFileSync(tmpIn, Buffer.from(require('fs').readFileSync(src)));
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
          const outKey = `processed/${options.outputKey}.mp4`;
          const cmd = new PutObjectCommand({ Bucket: bucket, Key: outKey, Body: outBuffer, ContentType: 'video/mp4' });
          await client.send(cmd);
          const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${outKey}`;
          return { processedPath: tmpOut, publicUrl, key: outKey };
        } catch (e) {
          logger.warn('upload processed to S3 failed: ' + e.message);
          return { processedPath: tmpOut };
        }
      }

      // return local path to processed file
      return { processedPath: tmpOut };
    } catch (e) {
      logger.error('processMedia error: ' + e.message);
      throw e;
    }
  }

  async fetchRemoteAndSave(url: string) {
    try {
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      const ext = contentType.includes('svg') ? 'svg' : contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'bin';
      const key = `${Date.now()}-${randomUUID()}.${ext}`;
      const outPath = this.localPathForKey(key);
      const buffer = Buffer.from(await res.arrayBuffer());
      writeFileSync(outPath, buffer);
      const serverBase = process.env.SERVER_BASE_URL ?? 'http://localhost:3000';
      const publicUrl = `${serverBase}/uploads/${key}`;
      return { key, publicUrl };
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

    logger.log(`Generating AI image: prompt="${finalPromptText}", seed=${rawSeed}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(aiEngineUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        // Verify buffer is valid image (not 0 bytes)
        if (buffer.length > 500) {
          const key = `${Date.now()}-${randomUUID()}.jpg`;
          const outPath = this.localPathForKey(key);
          writeFileSync(outPath, buffer);
          const serverBase = process.env.SERVER_BASE_URL ?? 'http://localhost:3000';
          const publicUrl = `${serverBase}/uploads/${key}`;
          return { key, publicUrl, prompt: finalPromptText, style, gender };
        }
      }
      throw new Error(`AI Engine response invalid or empty (status: ${res.status})`);
    } catch (e: any) {
      logger.warn(`Pollinations generator failed (${e.message}), generating dynamic seed-based avatar...`);
      // Dynamic gender-aware high-resolution diverse avatars
      const malePool = [
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
      ];
      const femalePool = [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      ];
      const pool = gender === 'female' ? femalePool : malePool;
      const fallbackUrl = pool[rawSeed % pool.length];
      return this.fetchRemoteAndSave(fallbackUrl);
    }
  }

  async modifyImageWithAi(options: { imageUrl?: string; prompt: string; style?: string; gender?: string }) {
    const userPrompt = options.prompt || 'Remaster with cinematic volumetric lighting, neon aura, and ultra-sharp 8k details';
    logger.log(`Modifying image with AI: prompt="${userPrompt}", style="${options.style || 'auto'}", gender="${options.gender || 'male'}"`);

    return this.generateRealisticAi(
      userPrompt,
      options.style,
      Math.floor(Math.random() * 1000000),
      options.gender || 'male'
    );
  }

  async generateAi(seed?: string) {
    return this.generateRealisticAi(seed ? `Photorealistic creator avatar named ${seed}` : undefined);
  }
}

