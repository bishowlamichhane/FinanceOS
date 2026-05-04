import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig, loadEnv } from './config/app.config';

async function bootstrap(): Promise<void> {
  // Load + validate env BEFORE Nest boots, so misconfig fails fast.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfig);
  const logger = new Logger('Bootstrap');

  // ------------------------------------------------------------
  // Security middleware
  // ------------------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: config.isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ------------------------------------------------------------
  // Global pipes / behaviors
  // ------------------------------------------------------------
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     transform: true,
  //     whitelist: true,
  //     forbidNonWhitelisted: false,
  //   }),
  // );

  app.setGlobalPrefix(env.API_PREFIX, {
    exclude: ['health', '(.*)/health'],
  });

  // ------------------------------------------------------------
  // OpenAPI / Swagger
  // ------------------------------------------------------------
  if (!config.isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Finance OS API')
      .setDescription('Personal finance + portfolio tracker — REST API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // ------------------------------------------------------------
  // Sentry (optional)
  // ------------------------------------------------------------
  if (env.SENTRY_DSN) {
    try {
      // Lazy import — only loads when DSN configured
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/nestjs');
      Sentry.init({
        dsn: env.SENTRY_DSN,
        tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
        environment: env.NODE_ENV,
      });
      logger.log('Sentry initialized');
    } catch (e) {
      logger.warn('Sentry init failed (continuing without it)');
    }
  }

  // ------------------------------------------------------------
  // Graceful shutdown
  // ------------------------------------------------------------
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`API listening on http://localhost:${env.PORT}/${env.API_PREFIX}`);
  if (!config.isProd) {
    logger.log(`Swagger docs: http://localhost:${env.PORT}/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start:', err);
  process.exit(1);
});
