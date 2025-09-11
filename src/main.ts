import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    app.enableCors({
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL || true
          : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Blog API')
        .setDescription('The Blog API description')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document);
    }

    app.getHttpAdapter().get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');

    logger.log(`Application is running on port: ${port}`);

    if (process.env.NODE_ENV !== 'production') {
      logger.log(`API Documentation: http://localhost:${port}/api`);
    }

    if (process.env.NODE_ENV === 'production') {
      setupKeepAlive();
    }
  } catch (error) {
    logger.error('❌ Error starting the application:', error);
    process.exit(1);
  }
}

function setupKeepAlive() {
  const PING_INTERVAL = 8 * 60 * 1000;
  const MAX_RETRIES = 3;
  let retryCount = 0;

  const keepAlive = async () => {
    try {
      const PING_URL = process.env.RENDER_EXTERNAL_URL
        ? `${process.env.RENDER_EXTERNAL_URL}/health`
        : 'https://test-beincom-be.onrender.com/health';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(PING_URL, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'KeepAlive/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        logger.log(
          `Keep-alive ping successful: ${response.status} at ${new Date().toISOString()}`,
        );
        retryCount = 0;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      retryCount++;
      logger.warn(
        `Keep-alive ping failed (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`,
      );

      if (retryCount >= MAX_RETRIES) {
        logger.error(
          'Max keep-alive retries reached. Service may be unhealthy.',
        );
        retryCount = 0;
      }
    }
  };

  setTimeout(keepAlive, 2 * 60 * 1000);

  setInterval(keepAlive, PING_INTERVAL);

  logger.log('Keep-alive service started - will ping every 8 minutes');
}

process.on('SIGINT', () => {
  logger.log('Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.log('Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap();
