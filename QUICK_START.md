# Quick Start Guide

## Overview

Your application now uses a three-tier architecture:
```
Frontend → Backend API → Supabase
```

## Prerequisites

- Node.js 18+ installed
- Supabase project created
- Vercel account (for deployment)

## Step 1: Configure Backend

### 1.1 Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Project Settings → API
3. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key (⚠️ Keep secret!)

### 1.2 Create Backend Environment File

Create `backend/.env`:

```env
NODE_ENV=development
PORT=3001
API_PREFIX=api
FRONTEND_ORIGIN=http://localhost:5173

# From Supabase dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generate strong random strings (32+ characters)
JWT_SECRET=your_very_strong_secret_key_here_min_32_characters_long
JWT_REFRESH_SECRET=your_very_strong_refresh_secret_key_min_32_chars
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

To generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.3 Install and Run Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend will run at: `http://localhost:3001`

### 1.4 Verify Backend

Test health endpoint:
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "API is healthy",
  "timestamp": "2024-12-11T..."
}
```

View API documentation:
Open `http://localhost:3001/api/docs` in your browser (Swagger UI)

## Step 2: Configure Frontend

### 2.1 Create Frontend Environment File

The `.env` file should already exist. Verify it contains:

```env
# Backend API
VITE_API_URL=http://localhost:3001/api

# Supabase (optional, for realtime subscriptions)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Environment
VITE_APP_ENV=development
```

### 2.2 Install and Run Frontend

```bash
npm install
npm run dev
```

Frontend will run at: `http://localhost:5173`

## Step 3: Test the Application

1. **Register a new user:**
   - Open `http://localhost:5173`
   - Click "Регистрация"
   - Create an account

2. **Verify API flow:**
   - Open browser DevTools → Network tab
   - Login/Register
   - You should see requests to `localhost:3001/api/auth/...`
   - NO requests should go to `*.supabase.co/rest/v1/`

3. **Test protected routes:**
   - After login, navigate through the app
   - Check that all requests include JWT token in headers

## Deployment to Vercel

### Deploy Backend First

```bash
cd backend
vercel
```

Configure environment variables in Vercel dashboard (same as `.env` above).

After deployment, test:
```bash
curl https://your-backend.vercel.app/api/health
```

### Deploy Frontend

```bash
vercel
```

Configure in Vercel dashboard:
```env
VITE_API_URL=https://your-backend.vercel.app/api
```

## Troubleshooting

### Backend won't start

**Error: "Supabase URL must be provided"**
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `backend/.env`

**Port already in use**
- Change `PORT=3001` to another port in `backend/.env`
- Update frontend's `VITE_API_URL` accordingly

### Frontend can't connect to backend

**Error: "Failed to fetch"**
- Verify backend is running at `http://localhost:3001`
- Check `VITE_API_URL` in frontend `.env`
- Verify CORS: backend's `FRONTEND_ORIGIN` should match frontend URL

**401 Unauthorized**
- Login again to get fresh JWT tokens
- Check that backend's `JWT_SECRET` is set

### Database operations fail

**Error: "Service role key not provided"**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in backend `.env`
- Make sure you're using the `service_role` key, not `anon` key

**RLS policy errors**
- This shouldn't happen since backend uses service role key
- Check Supabase logs for actual error

## Development Workflow

1. **Backend changes:**
   - Edit code in `backend/src/`
   - Backend auto-reloads with `npm run start:dev`
   - Test with curl or Swagger UI

2. **Frontend changes:**
   - Edit code in `src/`
   - Frontend auto-reloads with `npm run dev`
   - Test in browser

3. **API integration:**
   - Update backend controller/service
   - Frontend uses `apiClient` from `src/core/api.ts`
   - Example:
     ```typescript
     import { apiClient } from '../core/api';
     const data = await apiClient.get('/your-endpoint');
     ```

## Common Commands

### Backend
```bash
cd backend
npm run start:dev    # Development with hot reload
npm run build        # Build for production
npm run start:prod   # Run production build
```

### Frontend
```bash
npm run dev          # Development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Next Steps

1. ✅ Verify both frontend and backend run locally
2. ✅ Test authentication flow
3. ✅ Deploy backend to Vercel
4. ✅ Deploy frontend to Vercel
5. ✅ Test production deployment
6. 📝 Read [ARCHITECTURE_CHANGES.md](./ARCHITECTURE_CHANGES.md) for details
7. 📝 Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for full deployment guide

## Support

If you get stuck:

1. Check that both `.env` files are configured correctly
2. Verify backend is running and accessible
3. Check browser DevTools → Console and Network tabs
4. Check backend logs in terminal
5. Test backend endpoints directly with curl

## Security Reminders

⚠️ **NEVER commit `.env` files to git**
⚠️ **NEVER share service role key publicly**
⚠️ **NEVER put service role key in frontend**
✅ **Service role key ONLY in backend environment**
✅ **Frontend ONLY has anon key (for realtime if needed)**
✅ **All database operations go through backend API**
