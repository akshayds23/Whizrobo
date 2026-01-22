import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const normalized =
      typeof responseBody === 'string'
        ? { message: responseBody }
        : (responseBody as Record<string, unknown>);

    response.status(status).json({
      statusCode: status,
      message: normalized.message ?? 'Request failed',
      error: normalized.error ?? null,
      details: normalized.errors ?? null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
