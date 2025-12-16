# Troubleshooting Authentication Issues

## What Was Fixed

1. **Made `/updates` and `/events` endpoints public** - эти endpoints не требуют авторизацию
2. **Updated HomePage to load data conditionally** - updates/events загружаются всегда, stats только для авторизованных пользователей
3. **Added extensive logging** - теперь логируются все этапы авторизации для отладки

## Changes Made

### Backend Changes

1. **HomeController** (`backend/src/modules/home/home.controller.ts`)
   - Added `@Public()` decorator to `/updates` and `/events` endpoints
   - Only `/stats` remains protected

2. **JwtAuthGuard** (`backend/src/modules/auth/guards/jwt-auth.guard.ts`)
   - Added debug logging to track authentication flow
   - Logs: request URL, public status, auth header presence

3. **AuthService** (`backend/src/modules/auth/auth.service.ts`)
   - Added logging to token generation
   - Shows whether JWT secrets are configured

### Frontend Changes

1. **HomePage** (`src/modules/home/components/HomePage.tsx`)
   - Now loads updates/events without requiring authentication
   - Only loads user stats when user is authenticated
   - No more 401 errors for public data

## How to Test

### 1. Check Backend Health

Visit your backend URL and check the health endpoint:

```bash
curl https://your-backend.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "config": {
    "hasJwtSecret": true,
    "hasAnonKey": true,
    "hasServiceKey": true
  }
}
```

**Important:** If `hasJwtSecret` is `false`, you need to configure `JWT_SECRET` in Vercel environment variables.

### 2. Test Public Endpoints

These should work WITHOUT authentication:

```bash
# Platform updates (should return 200)
curl https://your-backend.vercel.app/api/home/updates

# Platform events (should return 200)
curl https://your-backend.vercel.app/api/home/events
```

### 3. Test Protected Endpoint

This should return 401 without token:

```bash
# User stats (should return 401)
curl https://your-backend.vercel.app/api/home/stats
```

### 4. Check Browser Console

When you load the homepage, you should see:
- No 401 errors for `/updates` and `/events`
- Data loading successfully
- Platform updates and events displayed

### 5. Check Vercel Logs

Go to Vercel dashboard → Your project → Logs

Look for these debug messages:
- `[JwtAuthGuard] Request: GET /api/home/updates - Public: true`
- `[JwtAuthGuard] Public endpoint, skipping authentication`
- `[AuthService] Generating tokens for user: ...`

## Common Issues

### Issue: Still getting 401 errors

**Cause:** JWT_SECRET not configured on Vercel

**Solution:**
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add `JWT_SECRET` with a secure random string (at least 32 characters)
3. Add `JWT_REFRESH_SECRET` with another secure random string
4. Redeploy the backend

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: Public endpoints still require auth

**Cause:** Old deployment or caching

**Solution:**
1. Force redeploy backend on Vercel
2. Clear browser cache
3. Check Vercel logs to confirm new code is running

### Issue: Login works but token doesn't persist

**Cause:** Frontend localStorage issue

**Solution:**
1. Open DevTools → Application → Local Storage
2. Check for `accessToken` and `refreshToken`
3. If missing, check auth.ts login flow

## Next Steps

1. **Deploy backend to Vercel** with updated code
2. **Configure environment variables** (if not already done)
3. **Test each endpoint** using the steps above
4. **Check browser console** for any remaining errors
5. **Check Vercel logs** for debug messages

## Verification Checklist

- [ ] Backend health check shows `hasJwtSecret: true`
- [ ] `/api/home/updates` returns 200 without auth
- [ ] `/api/home/events` returns 200 without auth
- [ ] `/api/home/stats` returns 401 without auth
- [ ] No 401 errors in browser console for public endpoints
- [ ] HomePage loads successfully without login
- [ ] Updates and events display correctly
- [ ] Login works and stats load after authentication
