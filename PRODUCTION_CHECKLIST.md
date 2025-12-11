# Production Deployment Checklist

## Pre-Deployment

### Backend Configuration
- [ ] Backend code pushed to repository
- [ ] `backend/.env` configured locally (DO NOT commit)
- [ ] `backend/api/index.ts` exists
- [ ] `backend/vercel.json` configured
- [ ] Backend tested locally: `npm run start:dev` works

### Frontend Configuration
- [ ] Frontend code pushed to repository
- [ ] `.env` configured locally (DO NOT commit)
- [ ] `VITE_API_BASE_URL` points to localhost for local dev
- [ ] Frontend tested locally: `npm run dev` works
- [ ] Build works: `npm run build` succeeds

## Backend Deployment

### Step 1: Deploy to Vercel
- [ ] Created new Vercel project for backend
- [ ] Set Root Directory to `backend`
- [ ] Deployment successful

### Step 2: Configure Environment Variables
Set these in Vercel dashboard → Settings → Environment Variables:

**Critical Variables:**
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (NOT anon key!)
- [ ] `JWT_SECRET` - Strong random 32+ char string
- [ ] `JWT_REFRESH_SECRET` - Different strong random string
- [ ] `FRONTEND_ORIGIN` - Will update after frontend is deployed

**Standard Variables:**
- [ ] `NODE_ENV=production`
- [ ] `API_PREFIX=api`
- [ ] `JWT_EXPIRATION=3600`
- [ ] `JWT_REFRESH_EXPIRATION=604800`

### Step 3: Verify Backend
Your backend URL: `https://______________.vercel.app`

Test commands:
```bash
# Health check
curl https://YOUR-BACKEND.vercel.app/api/health

# Expected: {"status":"ok","message":"API is healthy",...}
```

- [ ] Health check returns 200 OK
- [ ] Response includes `"status":"ok"`
- [ ] No 404 errors
- [ ] Swagger docs work: `https://YOUR-BACKEND.vercel.app/api/docs`

## Frontend Deployment

### Step 1: Deploy to Vercel
- [ ] Created new Vercel project for frontend
- [ ] Root Directory is `.` (project root)
- [ ] DO NOT deploy yet - configure env vars first

### Step 2: Configure Environment Variables
Set in Vercel dashboard → Settings → Environment Variables:

**Required:**
- [ ] `VITE_API_BASE_URL=https://YOUR-BACKEND.vercel.app`

**Optional:**
- [ ] `VITE_APP_ENV=production`
- [ ] `VITE_SUPABASE_URL` (only if using realtime)
- [ ] `VITE_SUPABASE_ANON_KEY` (only if using realtime)

### Step 3: Deploy Frontend
- [ ] Clicked "Deploy"
- [ ] Deployment successful
- [ ] No build errors

### Step 4: Update Backend CORS
- [ ] Go to backend project in Vercel
- [ ] Update `FRONTEND_ORIGIN` to frontend URL
- [ ] Redeploy backend

## Testing Production

Your frontend URL: `https://______________.vercel.app`
Your backend URL: `https://______________.vercel.app`

### 1. Open Frontend
- [ ] Frontend loads without errors
- [ ] No console errors in DevTools

### 2. Open Network Tab
- [ ] DevTools → Network tab open
- [ ] Clear all requests

### 3. Test Registration
- [ ] Click "Регистрация"
- [ ] Fill form with test data
- [ ] Submit form

**Verify in Network tab:**
- [ ] ✅ Sees request to: `https://YOUR-BACKEND.vercel.app/api/auth/signup`
- [ ] ❌ NO requests to: `http://localhost:3001`
- [ ] ❌ NO requests to: `https://xxx.supabase.co/rest/v1/`
- [ ] Response is 201 Created or 200 OK
- [ ] Response includes `accessToken` and `refreshToken`

### 4. Test Login
- [ ] Enter email and password
- [ ] Click "Вход"

**Verify in Network tab:**
- [ ] ✅ Sees request to: `https://YOUR-BACKEND.vercel.app/api/auth/login`
- [ ] ❌ NO localhost requests
- [ ] ❌ NO direct Supabase requests
- [ ] Response is 200 OK
- [ ] Response includes JWT tokens
- [ ] User is logged in

### 5. Test Protected Routes
- [ ] Navigate to profile
- [ ] Navigate to cards/campaigns

**Verify in Network tab:**
- [ ] All requests go to: `https://YOUR-BACKEND.vercel.app/api/...`
- [ ] Requests include: `Authorization: Bearer eyJ...`
- [ ] No 401 Unauthorized errors
- [ ] No localhost requests
- [ ] No direct Supabase requests

## Common Issues

### ❌ Failed to fetch
**Cause:** Frontend can't connect to backend

**Fix:**
1. Verify `VITE_API_BASE_URL` is set in frontend Vercel env vars
2. Redeploy frontend after setting env vars
3. Clear browser cache
4. Check Network tab - should see backend URL, not localhost

### ❌ 404 Not Found on backend
**Cause:** Backend routes not configured

**Fix:**
1. Verify Root Directory is `backend` in Vercel settings
2. Check `backend/api/index.ts` exists
3. Check `backend/vercel.json` is correct
4. Check Vercel deployment logs

### ❌ CORS Error
**Cause:** Backend blocking frontend requests

**Fix:**
1. Set `FRONTEND_ORIGIN` in backend env vars
2. Use exact frontend URL (with https://)
3. No trailing slash
4. Redeploy backend

### ❌ 401 Unauthorized
**Cause:** JWT not working

**Fix:**
1. Check `JWT_SECRET` is set in backend
2. Clear browser localStorage
3. Login again
4. Check that tokens are being stored

### ❌ 500 Internal Server Error
**Cause:** Backend configuration issue

**Fix:**
1. Check Vercel function logs
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Verify it's the service_role key, not anon key
4. Check all required env vars are set

### ❌ Still connecting to localhost
**Cause:** Environment variable not loaded

**Fix:**
1. Verify env var is set in Vercel dashboard
2. Rebuild and redeploy frontend
3. Hard refresh browser (Ctrl+F5)
4. Clear browser cache completely

## Success Criteria

✅ **Backend:**
- Health check returns 200 OK
- Swagger docs accessible
- All env vars configured
- No 404 errors

✅ **Frontend:**
- Loads without errors
- No console errors
- Connects to backend, not localhost

✅ **API Flow:**
- Registration works
- Login works
- Protected routes work
- All requests go to backend
- NO localhost requests in production
- NO direct Supabase requests

✅ **Network Tab Shows:**
```
✅ POST https://backend.vercel.app/api/auth/signup
✅ POST https://backend.vercel.app/api/auth/login
✅ GET  https://backend.vercel.app/api/auth/me
✅ GET  https://backend.vercel.app/api/profiles/xxx
❌ NO  http://localhost:3001/...
❌ NO  https://xxx.supabase.co/rest/v1/...
```

## Final Verification Script

Run these curl commands to verify backend:

```bash
# Set your backend URL
BACKEND_URL="https://YOUR-BACKEND.vercel.app"

# Test health
curl $BACKEND_URL/api/health

# Test registration
curl -X POST $BACKEND_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","userType":"influencer"}'

# Test login (save the token)
curl -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Test protected endpoint (use token from above)
curl $BACKEND_URL/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

All should return valid JSON responses, no errors.

## Documentation

After successful deployment, update:
- [ ] README.md with production URLs
- [ ] Team documentation with access info
- [ ] Update any API documentation

## Monitoring

Set up monitoring for:
- [ ] Vercel deployment status
- [ ] Function logs in Vercel dashboard
- [ ] Error tracking (Sentry, LogRocket, etc.)
- [ ] Uptime monitoring

## Rollback Plan

If production breaks:
1. Revert to previous deployment in Vercel
2. Check what changed between deployments
3. Fix in development
4. Test locally
5. Redeploy

## Notes

Write your production URLs here:

**Backend URL:** `https://______________.vercel.app`
**Frontend URL:** `https://______________.vercel.app`
**Supabase URL:** `https://______________.supabase.co`

**Deployment Date:** _______________
**Deployed By:** _______________
**Status:** [ ] Working [ ] Issues

**Issues Found:**
-
-
-
