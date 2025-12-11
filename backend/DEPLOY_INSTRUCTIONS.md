# ⚠️ BACKEND NOT DEPLOYED YET - INSTRUCTIONS

## Current Situation

✅ **Code is READY:**
- `api/index.js` exists (JavaScript, not TypeScript)
- `dist/` folder built with compiled NestJS
- `vercel.json` configured correctly

❌ **Production is NOT UPDATED:**
```bash
$ curl https://backend-ten-bice-31.vercel.app/api/health
X-Vercel-Error: NOT_FOUND
```

This confirms: **Your production deployment is outdated or missing.**

## What You Need to Do

### Method 1: Vercel CLI (Fastest)

**Step 1: Get Vercel Token**

1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: "Backend Deploy"
4. Copy the token

**Step 2: Deploy**

```bash
cd backend

# Set your token
export VERCEL_TOKEN=your_token_here

# Deploy to production
vercel --prod

# Or in one command:
VERCEL_TOKEN=your_token vercel --prod
```

**Step 3: Test**

```bash
./test-production.sh
```

Should now show ✅ instead of ❌

### Method 2: Vercel Dashboard (If no CLI access)

1. Go to: https://vercel.com/dashboard
2. Find project: `backend-ten-bice-31`
3. Click "..." → Settings
4. General → Root Directory: Set to `backend`
5. Go back → Click "Redeploy" on latest deployment
6. Wait for build to complete

### Method 3: Git Push (If connected)

If your Vercel project is connected to GitHub/GitLab:

```bash
# From project root
git add backend/
git commit -m "Fix backend serverless config - real deployment"
git push origin main
```

Vercel will auto-deploy. Monitor at: https://vercel.com/dashboard

## ⚠️ CRITICAL: Environment Variables

**BEFORE deploying**, set these in Vercel Dashboard:

Go to: https://vercel.com/backend-ten-bice-31/settings/environment-variables

### Required Variables:

```env
SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from_supabase>
SUPABASE_ANON_KEY=<from_supabase>
JWT_SECRET=<generate_32_char_random>
JWT_REFRESH_SECRET=<generate_32_char_random>
FRONTEND_ORIGIN=*
NODE_ENV=production
```

### Get Supabase Keys:

1. https://supabase.com/dashboard/project/skykdaqrbudwbvrrblgj/settings/api
2. Copy:
   - URL
   - anon public key
   - service_role secret key

### Generate JWT Secrets:

```bash
# Run twice for two different secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## After Deployment

Run the test script:

```bash
cd backend
./test-production.sh
```

**Expected output:**
```
✅ PASS: Health endpoint works!
✅ PASS: CORS headers present!
✅ PASS: Returns JSON (function is running!)
✅ DEPLOYMENT SUCCESSFUL!
```

**If still getting X-Vercel-Error:**

1. Check deployment logs:
   ```bash
   vercel logs backend-ten-bice-31 --prod
   ```

2. Verify Root Directory in Vercel settings = `backend`

3. Check that build succeeded:
   - Go to Vercel Dashboard
   - Click latest deployment
   - Check "Build Logs"
   - Should see: `✓ Compiled successfully`

4. Verify `api/index.js` exists (not .ts!)

## Files Ready for Deploy

```
backend/
├── api/
│   └── index.js              ✅ Serverless function
├── dist/                     ✅ Built (compiled NestJS)
│   ├── app.module.js
│   └── modules/auth/...
├── vercel.json               ✅ Modern configuration
├── package.json              ✅ Dependencies
└── test-production.sh        ✅ Test script
```

## Deploy Command Reference

```bash
# Login to Vercel
vercel login

# Link to existing project (if needed)
vercel link

# Deploy to production
vercel --prod

# Check logs
vercel logs --prod

# Test deployment
./test-production.sh
```

## Troubleshooting

### "No existing credentials found"

**Solution:** Get token from https://vercel.com/account/tokens

```bash
export VERCEL_TOKEN=your_token
vercel --prod
```

### "Project not found"

**Solution:** Link to existing project

```bash
vercel link
# Enter:
# - Scope: your_vercel_account
# - Link to existing: Yes
# - Project: backend-ten-bice-31
```

### Build fails with missing modules

**Check:** Are all dependencies in `package.json` (not devDependencies)?

NestJS core packages must be in `dependencies`:
- @nestjs/core
- @nestjs/common
- @nestjs/platform-express
- express
- compression
- helmet

### Function deployed but routes return 404

**Check logs:**
```bash
vercel logs --prod --follow
```

Look for errors in function execution.

**Common issues:**
- Missing environment variables
- Can't import from dist/ (build failed)
- Module not found errors

## What Happens When You Deploy

1. **Vercel receives code**
   - Uploads `backend/` folder

2. **Build phase**
   ```bash
   npm install
   npm run build  # Creates dist/
   ```

3. **Function creation**
   - Creates serverless function from `api/index.js`
   - Packages with `dist/` and `node_modules/`

4. **Routing**
   - `/api/*` → `api/index.js` function
   - Function loads NestJS from `dist/app.module.js`

5. **Production live**
   - `https://backend-ten-bice-31.vercel.app` → your function

## Expected Test Results

### Before Deploy (Current):
```
❌ X-Vercel-Error: NOT_FOUND
❌ No CORS headers
❌ Plain text: "The page could not be found"
```

### After Deploy (Target):
```
✅ HTTP/2 200 OK
✅ content-type: application/json
✅ access-control-allow-origin: *
✅ {"status":"ok","message":"API is healthy"}
```

## Summary

**Code Status:** ✅ READY
**Deployment Status:** ❌ NOT DEPLOYED
**Action Required:** RUN `vercel --prod` in backend/

**Deploy now to fix the production 404 error!**

---

## Quick Start

```bash
# 1. Get token from https://vercel.com/account/tokens
export VERCEL_TOKEN=your_token_here

# 2. Deploy
cd backend
vercel --prod

# 3. Test
./test-production.sh

# 4. Expected: ✅ DEPLOYMENT SUCCESSFUL!
```

That's it! Deploy and the backend will work! 🚀
