import 'reflect-metadata';
import { config } from 'dotenv';
config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  await app.listen(3000);
  console.log('conversation-qa-pipeline running at http://localhost:3000');
}

bootstrap();
