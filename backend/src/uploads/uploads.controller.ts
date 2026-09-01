import { BadRequestException, Body, Controller, Get, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { existsSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { assertAllowedUploadMime, MAX_UPLOAD_BYTES, sanitizeUploadName } from './upload-safety';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presign')
  async presign(@Body() body: { filename: string; contentType: string }) {
    return this.uploads.presign(body.filename, body.contentType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('local')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (req, file, cb) => {
        try {
          assertAllowedUploadMime(file.mimetype);
          cb(null, true);
        } catch (error) {
          cb(error as Error, false);
        }
      },
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, join(process.cwd(), 'public', 'uploads'));
        },
        filename: (req, file, cb) => {
          const name = `${Date.now()}-${sanitizeUploadName(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  async localUpload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Upload file is required');
    return { publicUrl: `/uploads/${file.filename}`, filename: file.filename };
  }

  @UseGuards(JwtAuthGuard)
  @Post('process')
  async process(@Body() body: { inputUrl?: string; inputKey?: string; outputKey: string; trimStart?: number; trimEnd?: number; type?: string }) {
    const result = await this.uploads.processMedia({ inputUrl: body.inputUrl, inputKey: body.inputKey, outputKey: body.outputKey, trimStart: body.trimStart, trimEnd: body.trimEnd, type: body.type as any });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('fetch')
  async fetchRemote(@Body() body: { url: string }) {
    const result = await this.uploads.fetchRemoteAndSave(body.url);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai-generate')
  async aiGenerate(@Body() body: { seed?: string; prompt?: string; style?: string; gender?: string }) {
    if (body.prompt || body.style || body.gender) {
      return this.uploads.generateRealisticAi(body.prompt, body.style, undefined, body.gender);
    }
    const result = await this.uploads.generateAi(body.seed);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai-generate-realistic')
  async aiGenerateRealistic(@Body() body: { prompt: string; style?: string; seed?: number; gender?: string }) {
    const result = await this.uploads.generateRealisticAi(body.prompt, body.style, body.seed, body.gender);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai-modify')
  async aiModify(@Body() body: { imageUrl?: string; prompt: string; style?: string; gender?: string }) {
    const result = await this.uploads.modifyImageWithAi(body);
    return result;
  }

  // Serve uploads statically for local development
  @Get('public')
  publicFile(@Query('path') path: string, @Res() res) {
    const file = this.uploads.resolveLocalPublicPath(path || '');
    if (!existsSync(file)) return res.status(404).send('Not found');
    return res.sendFile(file);
  }
}
