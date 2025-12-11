# 🚀 DEPLOY BACKEND TO VERCEL - PRODUCTION

## Current Status

✅ **Code is ready:**
- `api/index.js` - Serverless function (CommonJS, not TypeScript)
- `dist/` - Compiled NestJS application
- `vercel.json` - Modern configuration with functions

❌ **Not deployed yet:**
- Current production URL returns `X-Vercel-Error: NOT_FOUND`
- Need to deploy to `backend-ten-bice-31.vercel.app`

## Files Ready for Deploy

```
backend/
├── api/
│   └── index.js           ← ✅ Serverless handler (JavaScript)
├── dist/                  ← ✅ Built (just ran npm run build)
│   ├── app.module.js
│   └── modules/...
├── vercel.json            ← ✅ Modern config
└── package.json
```

## Deploy Options

### Option 1: Vercel CLI (Recommended)

**Step 1: Get Vercel Token**

Go to: https://vercel.com/account/tokens

Create new token → Copy it

**Step 2: Deploy from terminal**

```bash
cd backend

# If you have the project linked already:
vercel --prod

# Or with token:
VERCEL_TOKEN=your_token_here vercel --prod

# Or set token first:
export VERCEL_TOKEN=your_vercel_token
vercel --prod
```

**Step 3: Verify deployment**
```bash
curl https://backend-ten-bice-31.vercel.app/api/health
```

### Option 2: Git Push (If connected to Vercel)

If your Vercel project is connected to Git:

```bash
# From project root
git add .
git commit -m "Fix backend serverless configuration"
git push origin main
```

Vercel will auto-deploy. Check dashboard: https://vercel.com/dashboard

### Option 3: Vercel Dashboard (Manual Upload)

1. Go to https://vercel.com/dashboard
2. Select project: `backend-ten-bice-31`
3. Settings → Git → Disconnect (if needed)
4. Import project → Browse → Select `backend/` folder
5. Deploy

## Environment Variables

**CRITICAL:** Set these in Vercel Dashboard before deploying!

Go to: https://vercel.com/backend-ten-bice-31/settings/environment-variables

```env
# Supabase (REQUIRED)
SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<get_from_supabase_dashboard>
SUPABASE_ANON_KEY=<get_from_supabase_dashboard>

# JWT (REQUIRED)
JWT_SECRET=<generate_32_char_random_string>
JWT_REFRESH_SECRET=<generate_32_char_random_string>
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# CORS (REQUIRED)
FRONTEND_ORIGIN=https://your-frontend.vercel.app
# Or for testing: FRONTEND_ORIGIN=*

# Node
NODE_ENV=production

# Optional
DEEPSEEK_API_KEY=<if_using_ai>
```

**Generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Get Supabase Keys

1. Go to: https://supabase.com/dashboard/project/skykdaqrbudwbvrrblgj/settings/api
2. Copy:
   - `URL` → SUPABASE_URL
   - `anon public` → SUPABASE_ANON_KEY
   - `service_role secret` → SUPABASE_SERVICE_ROLE_KEY

## Verify Deployment

After deployment, run these tests:

### Test 1: Health Check
```bash
curl -i https://backend-ten-bice-31.vercel.app/api/health
```

**Expected:**
```
HTTP/2 200 OK
content-type: application/json

{"status":"ok","message":"API is healthy"}
```

**NOT expected:**
```
HTTP/2 404 Not Found
x-vercel-error: NOT_FOUND    ← This means deploy failed!
```

### Test 2: CORS Preflight
```bash
curl -i -X OPTIONS https://backend-ten-bice-31.vercel.app/api/auth/login
```

**Expected:**
```
HTTP/2 200 OK
access-control-allow-origin: *
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-headers: Content-Type, Authorization, X-Requested-With, X-Client-Info, apikey
```

### Test 3: Login Endpoint
```bash
curl -X POST https://backend-ten-bice-31.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'
```

**Expected (even if credentials wrong):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

This is GOOD! It means:
- ✅ Vercel found the function
- ✅ NestJS is running
- ✅ Routing works
- ✅ Code executed

**NOT expected:**
```
404: NOT_FOUND
```

## Troubleshooting

### Still getting X-Vercel-Error: NOT_FOUND

**Check:**

1. **Is build included in deployment?**
   - Vercel must run `npm run build` before deploy
   - Check vercel.json has `"buildCommand": "npm run build"`

2. **Is api/index.js a .js file?**
   ```bash
   file backend/api/index.js
   # Should say: JavaScript source
   ```

3. **Does dist/ exist after build?**
   ```bash
   ls backend/dist/app.module.js
   ```

4. **Is Root Directory set to `backend`?**
   - Vercel Dashboard → Project Settings → General → Root Directory
   - Should be: `backend` (not empty!)

5. **Check deployment logs:**
   ```bash
   vercel logs backend-ten-bice-31 --prod
   ```

   Or in Dashboard:
   - https://vercel.com/backend-ten-bice-31
   - Click latest deployment
   - Check "Build Logs" and "Function Logs"

### Function found but routes return 404

**Check logs:**
```bash
vercel logs backend-ten-bice-31 --prod --follow
```

Should see:
```
📥 POST /api/auth/login
✅ NestJS initialized for Vercel
```

If you see errors about missing modules:
- Check that `dist/` was included in deployment
- Check that dependencies are in `package.json` (not devDependencies)

### CORS errors in browser

**Fix:** Set FRONTEND_ORIGIN correctly

```env
FRONTEND_ORIGIN=https://your-actual-frontend.vercel.app
```

Or temporarily for testing:
```env
FRONTEND_ORIGIN=*
```

## Quick Deploy Script

Save this as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🔨 Building..."
npm run build

echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployed!"
echo ""
echo "🧪 Testing..."
echo ""
echo "Health check:"
curl -s https://backend-ten-bice-31.vercel.app/api/health | jq

echo ""
echo "🎉 Deployment complete!"
```

Run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Next Steps After Deploy

1. ✅ Verify health endpoint returns 200
2. ✅ Verify no `X-Vercel-Error` headers
3. ✅ Test login endpoint (should return JSON, not 404)
4. ✅ Update frontend to use production backend URL
5. ✅ Test full login flow from frontend

## Current Backend Files

### backend/api/index.js
```javascript
// Uses CommonJS (require/module.exports)
// Imports from dist/app.module.js
// Strips /api prefix from URL
// Handles CORS
```

### backend/vercel.json
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "functions": {
    "api/*.js": {
      "runtime": "@vercel/node@3",
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

## Summary

**What's Fixed:**
- ✅ JavaScript serverless function (not TypeScript)
- ✅ Modern Vercel config
- ✅ Compiled dist/ folder
- ✅ CORS configured
- ✅ URL stripping for correct routing

**What's Needed:**
- ⏳ Deploy to production
- ⏳ Set environment variables
- ⏳ Test endpoints

**After Deploy:**
- 🎯 No more `X-Vercel-Error: NOT_FOUND`
- 🎯 Login returns JSON response
- 🎯 Frontend can authenticate

Deploy now and test! 🚀
