# Vercel Deployment Setup Guide

## Backend Deployment

### Step 1: Deploy Backend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your repository
4. **Important:** Set the Root Directory to `backend`
5. Click "Deploy"

### Step 2: Configure Backend Environment Variables

In Vercel dashboard for your **backend project**, add these environment variables:

**Required Variables:**

```env
# Node Environment
NODE_ENV=production
API_PREFIX=api

# Frontend Origin (your frontend domain)
FRONTEND_ORIGIN=https://your-frontend.vercel.app

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Configuration (generate strong random strings)
JWT_SECRET=your_very_strong_secret_key_here_minimum_32_characters
JWT_REFRESH_SECRET=your_very_strong_refresh_secret_minimum_32_characters
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

**How to generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **CRITICAL:**
- `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key, NOT the anon key!
- Find it in Supabase Dashboard → Project Settings → API → service_role key
- This key bypasses Row Level Security and should NEVER be exposed to frontend

### Step 3: Verify Backend Deployment

After deployment, test your backend:

```bash
# Replace with your actual backend URL
curl https://your-backend.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "API is healthy",
  "timestamp": "2024-12-11T...",
  "uptime": 123.456,
  "environment": "production"
}
```

If you get 404, check:
- Root directory is set to `backend` in Vercel project settings
- `backend/api/index.ts` file exists
- `backend/vercel.json` is configured correctly

## Frontend Deployment

### Step 1: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your repository
4. **Important:** Root Directory should be `.` (project root, not `backend`)
5. DO NOT deploy yet - first configure environment variables

### Step 2: Configure Frontend Environment Variables

In Vercel dashboard for your **frontend project**, add:

**Required:**

```env
# Backend API URL (your backend Vercel domain)
VITE_API_BASE_URL=https://your-backend.vercel.app
```

**Optional (only if you need realtime subscriptions):**

```env
# Supabase Configuration (optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Environment
VITE_APP_ENV=production
```

⚠️ **IMPORTANT:**
- Frontend should ONLY have `VITE_API_BASE_URL` pointing to backend
- Frontend should NEVER have `SUPABASE_SERVICE_ROLE_KEY`
- Frontend should NEVER make direct calls to Supabase REST API

### Step 3: Deploy Frontend

Now click "Deploy" in Vercel dashboard.

### Step 4: Update Backend CORS

After frontend is deployed, update backend's `FRONTEND_ORIGIN` environment variable:

1. Go to backend project in Vercel
2. Settings → Environment Variables
3. Update `FRONTEND_ORIGIN` to your frontend URL: `https://your-frontend.vercel.app`
4. Redeploy backend for changes to take effect

## Verification Checklist

### Backend Verification

- [ ] Backend deployed successfully
- [ ] All environment variables configured
- [ ] Health endpoint returns 200: `curl https://your-backend.vercel.app/api/health`
- [ ] Swagger docs accessible: `https://your-backend.vercel.app/api/docs`
- [ ] No 404 errors on any routes

### Frontend Verification

- [ ] Frontend deployed successfully
- [ ] `VITE_API_BASE_URL` points to backend domain
- [ ] Open browser DevTools → Network tab
- [ ] All API requests go to backend domain, NOT localhost
- [ ] NO requests to `*.supabase.co/rest/v1/` (except realtime websocket if used)
- [ ] Login works correctly
- [ ] Registration works correctly

### Test Authentication Flow

1. **Open your frontend:** `https://your-frontend.vercel.app`

2. **Open DevTools → Network tab**

3. **Register new user:**
   - Click "Регистрация"
   - Fill form and submit
   - Verify request goes to: `https://your-backend.vercel.app/api/auth/signup`
   - Should return 201 Created with JWT tokens

4. **Login:**
   - Use credentials
   - Verify request goes to: `https://your-backend.vercel.app/api/auth/login`
   - Should return 200 OK with JWT tokens

5. **Check Network tab:**
   ```
   ✅ POST https://your-backend.vercel.app/api/auth/signup
   ✅ POST https://your-backend.vercel.app/api/auth/login
   ✅ GET  https://your-backend.vercel.app/api/auth/me
   ❌ NO http://localhost:3001/... requests
   ❌ NO https://xxx.supabase.co/rest/v1/... requests
   ```

## Troubleshooting

### Backend Issues

**404 on all routes:**
- Check that Root Directory is set to `backend` in Vercel project settings
- Verify `backend/api/index.ts` exists
- Check Vercel deployment logs for errors

**500 Internal Server Error:**
- Check environment variables are set correctly
- Verify `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not anon key
- Check Vercel function logs

**CORS errors:**
- Verify `FRONTEND_ORIGIN` matches your frontend URL exactly
- Include protocol (https://)
- No trailing slash

### Frontend Issues

**Failed to fetch / Network Error:**
- Verify `VITE_API_BASE_URL` is set in Vercel environment variables
- Make sure it points to backend domain: `https://your-backend.vercel.app`
- DO NOT include `/api` at the end - it's added automatically
- Redeploy frontend after changing environment variables

**Still connecting to localhost:**
- Environment variable not set in Vercel
- Rebuild and redeploy frontend
- Clear browser cache
- Check Network tab - should see backend domain, not localhost

**401 Unauthorized on all requests:**
- Backend JWT_SECRET not set
- Tokens not being stored properly
- Check that login returns `accessToken` and `refreshToken`

## Environment Variables Summary

### Backend (on Vercel)
```env
NODE_ENV=production
API_PREFIX=api
FRONTEND_ORIGIN=https://your-frontend.vercel.app

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← Service role key!

JWT_SECRET=random_32_chars
JWT_REFRESH_SECRET=random_32_chars
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### Frontend (on Vercel)
```env
VITE_API_BASE_URL=https://your-backend.vercel.app
VITE_APP_ENV=production
```

### Local Development

**Backend `.env`:**
```env
NODE_ENV=development
PORT=3001
API_PREFIX=api
FRONTEND_ORIGIN=http://localhost:5173

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

JWT_SECRET=random_32_chars
JWT_REFRESH_SECRET=random_32_chars
```

**Frontend `.env`:**
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_ENV=development
```

## Architecture Flow

```
User Browser
    ↓
Frontend (Vercel)
    ↓ HTTPS Request with JWT
Backend API (Vercel)
    ↓ Supabase Service Role Key
Supabase Database
```

**Security:**
- Frontend NEVER accesses Supabase directly
- Backend uses service role key to bypass RLS
- JWT tokens authenticate users to backend
- Backend enforces all authorization rules

## Next Steps After Deployment

1. Test all functionality in production
2. Monitor Vercel function logs for errors
3. Set up custom domains (optional)
4. Configure Vercel production environment variables for secrets
5. Test with real users
6. Monitor performance and errors

## Useful Commands

**Test backend health:**
```bash
curl https://your-backend.vercel.app/api/health
```

**Test backend auth:**
```bash
curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Check Vercel logs:**
```bash
vercel logs your-project-name --follow
```

## Support

If deployment fails:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test backend endpoints with curl
4. Check browser console and Network tab
5. Verify CORS settings
