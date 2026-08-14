import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }), {
    bufferLogs: false,
  });
  const config = app.get(ConfigService);

  // Cast: @fastify/cookie augments its own `fastify` module instance, which differs from the
  // one bundled by @nestjs/platform-fastify — a known, harmless plugin-typing interop gap.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyCookie as any, {
    secret: config.get<string>('COOKIE_SECRET'),
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: config.get<string>('FRONTEND_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  const live = config.get<boolean>('LIVE_TRADING');
  Logger.log(`Aurum API on http://localhost:${port}/api/v1  (LIVE_TRADING=${live})`, 'Bootstrap');
}

void bootstrap();
