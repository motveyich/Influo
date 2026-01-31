const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');

let cachedApp = null;

async function bootstrapServer() {
  if (cachedApp) {
    return cachedApp;
  }

  // Dynamic import to avoid issues with module resolution
  const { AppModule } = await import('../dist/app.module.js');

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(
    AppModule,
    adapter,
    {
      logger: ['error', 'warn', 'log'],
      abortOnError: false
    }
  );

  const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;

  // CRITICAL: DO NOT set global prefix here
  // The request path /api/auth/login should match controller @Controller('auth')
  // WITHOUT an additional /api prefix

  app.enableCors({
    origin: frontendOrigin ? [
      frontendOrigin,
      'http://localhost:5173',
      'http://localhost:3000',
      /\.vercel\.app$/,
    ] : '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Info', 'apikey'],
  });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
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

  console.log('✅ NestJS initialized for Vercel');
  console.log(`🌐 CORS: ${frontendOrigin}`);
  console.log(`📍 Routes: /auth/login, /profiles, etc.`);

  return expressApp;
}

module.exports = async (req, res) => {
  try {
    console.log(`📥 ${req.method} ${req.url}`);

    // Handle CORS preflight requests immediately
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Client-Info, apikey');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.status(200).end();
      return;
    }

    const app = await bootstrapServer();

    // Add CORS headers to all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Client-Info, apikey');

    // Strip /api prefix from URL before passing to NestJS
    // Vercel sends: /api/auth/login
    // We need: /auth/login for NestJS controller
    const originalUrl = req.url;
    if (originalUrl.startsWith('/api')) {
      req.url = originalUrl.substring(4); // Remove '/api'
    }

    return app(req, res);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Unknown error'
    });
  }
};
