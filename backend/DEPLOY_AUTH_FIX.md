# Auth Fix - "Invalid or expired token" Issue

## Problem
Login and signup endpoints were returning 401 "Invalid or expired token" error because they were protected by the global JWT guard without the `@Public()` decorator.

## Solution
Added `@Public()` decorator to public authentication endpoints:
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh

## Changes Made

### File: `backend/src/modules/auth/auth.controller.ts`
- Imported `@Public()` decorator
- Added `@Public()` to `signup`, `login`, and `refresh` endpoints

## Deployment Instructions

### Option 1: Deploy from Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Find your backend project
3. Click "Deployments" tab
4. Click "Redeploy" on the latest deployment
5. Or push changes to git and Vercel will auto-deploy

### Option 2: Deploy from Command Line
```bash
cd backend
vercel --prod
```

### Option 3: Auto-deploy via Git
1. Commit changes:
```bash
git add backend/src/modules/auth/auth.controller.ts
git commit -m "fix: add @Public decorator to auth endpoints"
git push
```

2. Vercel will automatically deploy if connected to your repository

## Testing After Deployment

1. Wait 1-2 minutes for deployment to complete
2. Test login endpoint:
```bash
curl -X POST https://influo-seven.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

3. Expected response: 200 OK with user data and tokens (or 401 if credentials are invalid)
4. Should NOT return "Invalid or expired token" error

## Frontend Testing
1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh the page (Ctrl+F5)
3. Try to login with valid credentials
4. Should successfully authenticate without "Invalid or expired token" error

## Technical Details

The global JWT guard in `app.module.ts` was protecting all endpoints by default. The `@Public()` decorator marks specific endpoints as publicly accessible, bypassing the JWT authentication requirement. This is necessary for:
- User registration (can't have token before registering)
- User login (can't have token before logging in)
- Token refresh (using refresh token, not access token)

## Troubleshooting

If still getting "Invalid or expired token" error:

1. **Verify deployment completed**
   - Check Vercel dashboard for deployment status
   - Ensure no deployment errors

2. **Check backend logs**
   - Go to Vercel dashboard → your project → Logs
   - Look for any runtime errors

3. **Verify CORS headers**
   - Check Network tab in browser DevTools
   - Ensure `Access-Control-Allow-Origin` header is present

4. **Clear all caches**
   - Clear browser cache completely
   - Try in incognito/private window
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

5. **Test with curl**
   - Use curl command above to test directly
   - This bypasses browser CORS and cache issues
