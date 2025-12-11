import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';

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

  const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      frontendOrigin,
      'http://localhost:5173',
      'http://localhost:3000',
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'apikey'],
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
  console.log(`🌐 CORS Origin: ${frontendOrigin}`);
  console.log(`📍 Global Prefix: /api`);
  console.log(`📍 Example: POST /api/auth/login`);

  return expressApp;
}

export default async (req: Request, res: Response) => {
  try {
    const app = await bootstrapServer();
    return app(req, res);
  } catch (error) {
    console.error('❌ Error initializing app:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
