import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    credentials: true,
    exposedHeaders: 'set-cookie',
  });

  app.useGlobalPipes(new ZodValidationPipe());

  const configService = new ConfigService();
  const port = configService.getOrThrow<number>('PORT');

  await app.listen(port);
}
bootstrap();
