import { Body, Controller, Post, UploadedFile, UseInterceptors, Get, Query, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  async presign(@Body() body: { filename: string; contentType: string }) {
    return this.uploads.presign(body.filename, body.contentType);
  }

  @Post('local')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'public', 'uploads');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const name = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
          cb(null, name);
        },
      }),
    }),
  )
  async localUpload(@UploadedFile() file: any) {
    return { publicUrl: `/uploads/${file.filename}`, filename: file.filename };
  }

  @Post('process')
  async process(@Body() body: { inputUrl?: string; inputKey?: string; outputKey: string; trimStart?: number; trimEnd?: number; type?: string }) {
    const result = await this.uploads.processMedia({ inputUrl: body.inputUrl, inputKey: body.inputKey, outputKey: body.outputKey, trimStart: body.trimStart, trimEnd: body.trimEnd, type: body.type as any });
    return result;
  }

  @Post('fetch')
  async fetchRemote(@Body() body: { url: string }) {
    const result = await this.uploads.fetchRemoteAndSave(body.url);
    return result;
  }

  @Post('ai-generate')
  async aiGenerate(@Body() body: { seed?: string; prompt?: string; style?: string; gender?: string }) {
    if (body.prompt || body.style || body.gender) {
      return this.uploads.generateRealisticAi(body.prompt, body.style, undefined, body.gender);
    }
    const result = await this.uploads.generateAi(body.seed);
    return result;
  }

  @Post('ai-generate-realistic')
  async aiGenerateRealistic(@Body() body: { prompt: string; style?: string; seed?: number; gender?: string }) {
    const result = await this.uploads.generateRealisticAi(body.prompt, body.style, body.seed, body.gender);
    return result;
  }

  @Post('ai-modify')
  async aiModify(@Body() body: { imageUrl?: string; prompt: string; style?: string; gender?: string }) {
    const result = await this.uploads.modifyImageWithAi(body);
    return result;
  }

  // Serve uploads statically for local development
  @Get('public')
  publicFile(@Query('path') path: string, @Res() res) {
    const file = join(process.cwd(), 'public', 'uploads', path || '');
    if (!existsSync(file)) return res.status(404).send('Not found');
    return res.sendFile(file);
  }
}
