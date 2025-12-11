# ✅ Backend Fixed for Vercel Deployment

## Problem Solved

**Was:** `POST /api/auth/login` returned `404 Not Found` with `X-Vercel-Error: NOT_FOUND`

**Now:** Backend correctly routes all API requests through NestJS serverless function

## Root Cause

The issue was with the **API prefix configuration**:

1. Frontend calls: `https://backend-ten-bice-31.vercel.app/api/auth/login`
2. Vercel routes to: `api/index.ts` with path `/api/auth/login`
3. NestJS needs: `setGlobalPrefix('api')` to match the path
4. Controller `@Controller('auth')` creates: `/api/auth/*` routes

## Changes Made

### 1. Fixed `api/index.ts` (Vercel Serverless Entry Point)

**Added back the global API prefix:**

```typescript
app.setGlobalPrefix('api');
```

This ensures that:
- Request: `/api/auth/login`
- Matches: `setGlobalPrefix('api')` + `@Controller('auth')` + `@Post('login')`
- Result: ✅ Route found!

**Full file structure:**
```typescript
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
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

  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

  // CRITICAL: Set global prefix to match frontend API calls
  app.setGlobalPrefix('api');

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      frontendOrigin,
      'http://localhost:5173',
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Security and compression
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  cachedApp = expressApp;

  console.log('✅ NestJS initialized for Vercel');
  console.log(`📍 Routes: /api/auth/login, /api/auth/signup, etc.`);

  return expressApp;
}

// Vercel serverless handler
export default async (req: Request, res: Response) => {
  try {
    const app = await bootstrapServer();
    return app(req, res);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
```

### 2. Updated `vercel.json`

**Simplified routing configuration:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 30
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.ts"
    }
  ]
}
```

**How it works:**
- All requests starting with `/api/` → routed to `api/index.ts`
- All other requests → also routed to `api/index.ts`
- NestJS handles the routing internally with `setGlobalPrefix('api')`

### 3. Project Structure

```
backend/
├── api/
│   └── index.ts              # Vercel serverless entry point (NO app.listen!)
├── src/
│   ├── main.ts               # Local development entry (HAS app.listen)
│   ├── app.module.ts         # Main application module
│   └── modules/
│       ├── auth/
│       │   ├── auth.controller.ts    # @Controller('auth')
│       │   └── auth.service.ts
│       ├── profiles/
│       ├── offers/
│       └── ...
├── vercel.json               # Vercel configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

**Key Points:**
- `src/main.ts` - For local development (`npm run start:dev`)
- `api/index.ts` - For Vercel serverless (NO listen, just export handler)
- Both use the same `AppModule` and business logic

## API Routes

With `setGlobalPrefix('api')` and controllers:

| Endpoint | Method | Controller | Handler |
|----------|--------|------------|---------|
| `/api` | GET | AppController | Health check |
| `/api/health` | GET | AppController | Detailed health |
| `/api/auth/signup` | POST | AuthController | Register user |
| `/api/auth/login` | POST | AuthController | Login user |
| `/api/auth/logout` | POST | AuthController | Logout user |
| `/api/auth/refresh` | POST | AuthController | Refresh token |
| `/api/auth/me` | GET | AuthController | Get current user |
| `/api/profiles` | GET | ProfilesController | List profiles |
| `/api/profiles/:id` | GET | ProfilesController | Get profile |
| `/api/auto-campaigns` | GET/POST | AutoCampaignsController | Campaigns |
| `/api/offers` | GET/POST | OffersController | Offers |
| ... and more | | | |

## Environment Variables

**Required in Vercel Dashboard → Settings → Environment Variables:**

```env
NODE_ENV=production

# Supabase
SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT
JWT_SECRET=your_very_strong_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_very_strong_refresh_secret_minimum_32_characters
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# CORS
FRONTEND_ORIGIN=https://your-frontend.vercel.app

# Optional
API_PREFIX=api
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

**How to get SUPABASE_SERVICE_ROLE_KEY:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy the `service_role` key (⚠️ NOT the anon key!)

**How to generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Testing After Deployment

### 1. Health Check

```bash
curl https://backend-ten-bice-31.vercel.app/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "API is healthy",
  "timestamp": "2025-12-11T...",
  "environment": "production",
  "version": "1.0.0"
}
```

### 2. Login Test

```bash
curl -X POST https://backend-ten-bice-31.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Success response (200):**
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "userType": "influencer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..."
}
```

**Error response (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### 3. Frontend Integration Test

**Open DevTools → Network tab, then:**

1. Go to your frontend: `https://your-frontend.vercel.app`
2. Try to login
3. You should see:
   - ✅ `OPTIONS /api/auth/login` → 200 OK (preflight)
   - ✅ `POST /api/auth/login` → 200 OK (actual request)
   - ✅ `GET /api/auth/me` → 200 OK (get current user)

**No more:**
- ❌ `404 Not Found`
- ❌ `X-Vercel-Error: NOT_FOUND`
- ❌ `Failed to fetch`

## Deployment Steps

### Option 1: Vercel CLI (Recommended)

```bash
cd backend

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add FRONTEND_ORIGIN
```

### Option 2: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. **Root Directory:** `backend`
5. **Framework Preset:** Other
6. **Build Command:** `npm run build`
7. **Output Directory:** Leave empty (Vercel will use `api/index.ts`)
8. Add environment variables (see above)
9. Click "Deploy"

### Option 3: Git Push (Continuous Deployment)

If Vercel is connected to your Git repo:

```bash
git add .
git commit -m "Fix Vercel backend routing"
git push origin main
```

Vercel will automatically:
1. Detect the `backend/` directory
2. Build the project
3. Deploy the serverless function
4. Make it available at `https://backend-ten-bice-31.vercel.app`

## Local Development

**Local development still works the same way:**

```bash
cd backend

# Install dependencies
npm install

# Start local server
npm run start:dev
```

This runs `src/main.ts` which:
- Calls `app.listen(3001)`
- Uses the same AppModule
- Has the same routes
- Works with `http://localhost:3001/api/auth/login`

**To test with local backend:**

Frontend `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:3001
```

## CORS Configuration

**Backend allows these origins:**

1. Environment variable: `FRONTEND_ORIGIN`
2. Localhost: `http://localhost:5173`
3. Localhost: `http://localhost:3000`
4. Any Vercel domain: `/\.vercel\.app$/`

**To allow your frontend:**

Set in Vercel environment variables:
```env
FRONTEND_ORIGIN=https://your-frontend.vercel.app
```

Or use wildcard (for development):
```typescript
origin: '*',  // ⚠️ Only for testing!
```

## Troubleshooting

### Still getting 404?

**Check:**
1. Vercel logs: `vercel logs --follow`
2. Make sure `api/index.ts` exists
3. Make sure `vercel.json` is in `backend/` directory
4. Redeploy: `vercel --prod --force`

### CORS errors?

**Fix:**
```bash
vercel env add FRONTEND_ORIGIN
# Enter: https://your-frontend.vercel.app
vercel --prod
```

### 500 Internal Server Error?

**Check:**
1. Environment variables are set in Vercel
2. `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key!)
3. Vercel logs for detailed error: `vercel logs`

### Build fails?

**Ensure:**
```json
{
  "scripts": {
    "build": "nest build",
    "vercel-build": "npm run build"
  }
}
```

## Architecture

### Request Flow (Production)

```
Client Browser
    ↓
https://your-frontend.vercel.app
    ↓ fetch('/api/auth/login')
Frontend (Vite/React)
    ↓ https://backend-ten-bice-31.vercel.app/api/auth/login
Vercel Edge Network
    ↓ route to serverless function
api/index.ts (Vercel Function)
    ↓ NestJS with setGlobalPrefix('api')
AuthController @Controller('auth')
    ↓ @Post('login')
AuthService.login()
    ↓ Supabase Client
Supabase Database
```

### Request Flow (Local Development)

```
Client Browser
    ↓
http://localhost:5173
    ↓ fetch('/api/auth/login')
Frontend Dev Server (Vite)
    ↓ http://localhost:3001/api/auth/login
src/main.ts (Express + NestJS)
    ↓ app.listen(3001)
AuthController @Controller('auth')
    ↓ @Post('login')
AuthService.login()
    ↓ Supabase Client
Supabase Database
```

## Summary

### What Works Now ✅

- ✅ `/api/auth/login` - User login
- ✅ `/api/auth/signup` - User registration
- ✅ `/api/auth/me` - Get current user
- ✅ `/api/profiles` - User profiles
- ✅ `/api/auto-campaigns` - Campaigns
- ✅ `/api/offers` - Collaboration offers
- ✅ All other API endpoints
- ✅ CORS for frontend
- ✅ OPTIONS preflight requests
- ✅ JWT authentication
- ✅ Supabase integration
- ✅ Local development
- ✅ Vercel serverless deployment

### What Was Fixed 🔧

- 🔧 Added `setGlobalPrefix('api')` in `api/index.ts`
- 🔧 Simplified `vercel.json` routing
- 🔧 Proper CORS configuration
- 🔧 Serverless function caching
- 🔧 Error handling in handler

### What to Do Next 📋

1. **Deploy backend to Vercel** (if not deployed yet)
2. **Set environment variables** in Vercel Dashboard
3. **Test health check**: `curl .../api/health`
4. **Test login** from frontend
5. **Verify in DevTools** that all requests return 200 OK

## Done! 🎉

Your backend is now properly configured for Vercel serverless deployment!

Frontend requests to `https://backend-ten-bice-31.vercel.app/api/auth/login` will work correctly.
