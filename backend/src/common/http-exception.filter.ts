import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

type SafeRequest = {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Catch()
export class SanitizedHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SanitizedHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<SafeRequest>();
    const requestId =
      Array.isArray(request?.headers?.['x-request-id'])
        ? request.headers['x-request-id'][0]
        : (request?.headers?.['x-request-id'] as string | undefined) || 'unknown';

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error' };

    const safeMessage = (() => {
      if (typeof payload === 'string') {
        return payload;
      }

      if (payload && typeof payload === 'object' && 'message' in payload) {
        const message = payload.message;

        if (typeof message === 'string') {
          return message;
        }

        if (Array.isArray(message)) {
          return message.filter((entry): entry is string => typeof entry === 'string').join(', ') || 'Request failed';
        }
      }

      return 'Request failed';
    })();

    this.logger.error(
      `Unhandled exception [${requestId}] ${request?.method ?? 'UNKNOWN'} ${request?.originalUrl ?? request?.url ?? 'unknown'}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      message: safeMessage,
      error: status >= 500 ? 'Internal Server Error' : 'Request failed',
      requestId,
    });
  }
}
