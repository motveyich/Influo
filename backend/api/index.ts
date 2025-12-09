import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as helmet from 'helmet';
import * as express from 'express';
import { Request, Response } from 'express';
import { AppModule } from '../src/app.module';

const server = express();
let cachedApp: any = null;

async function bootstrapServer() {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] }
  );

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get('API_PREFIX') || 'api';
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:5173';

  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:5173',
      'http://localhost:3000',
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  cachedApp = expressApp;

  console.log('✅ NestJS application initialized for Vercel');

  return expressApp;
}

export default async (req: Request, res: Response) => {
  const app = await bootstrapServer();
  return app(req, res);
};
