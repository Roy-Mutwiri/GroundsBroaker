import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';

/**
 * Consistent error envelope for the whole API:
 *   { "error": { "code": string, "message": string, "details"?: unknown } }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_error';
    let message = 'An unexpected error occurred.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        message = (r.message as string) ?? exception.message;
        code = (r.code as string) ?? httpStatusToCode(status);
        details = r.details;
        if (Array.isArray(r.message)) {
          message = 'Validation failed.';
          details = r.message;
          code = 'validation_error';
        }
      }
      if (code === 'internal_error') code = httpStatusToCode(status);
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(`${code}: ${message}`);
    }

    void reply.status(status).send({ error: { code, message, ...(details ? { details } : {}) } });
  }
}

function httpStatusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'bad_request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    422: 'validation_error',
    429: 'rate_limited',
  };
  return map[status] ?? 'error';
}
