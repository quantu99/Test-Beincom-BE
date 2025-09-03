import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? true
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('The Blog API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port: ${port}`);
  console.log(`API Documentation: http://localhost:${port}/api`);

  if (process.env.NODE_ENV === 'production') {
    const PING_URL = 'https://test-beincom-be.onrender.com/api';
    const PING_INTERVAL = 10 * 60 * 1000;

    const keepAlive = async () => {
      try {
        const response = await fetch(PING_URL);
        console.log(
          `Keep-alive ping successful: ${response.status} at ${new Date().toISOString()}`,
        );
      } catch (error) {
        console.log(
          `Keep-alive ping failed: ${error.message} at ${new Date().toISOString()}`,
        );
      }
    };

    setTimeout(keepAlive, 60 * 1000);

    setInterval(keepAlive, PING_INTERVAL);

    console.log('🚀 Keep-alive service started - will ping every 10 minutes');
  }
}
bootstrap();
