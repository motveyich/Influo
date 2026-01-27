# Vercel Database Setup Guide

## Problem Fixed

The backend was unable to connect to Supabase because:
1. Using old Supabase host format (`db.xxx.supabase.co`)
2. Not using the correct Connection Pooler for Vercel serverless

## Solution Implemented

Added support for `DATABASE_URL` environment variable with automatic URL parsing and fallback to individual `DB_*` variables.

---

## Setup Instructions

### Step 1: Get Your Supabase Connection String

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Project Settings** → **Database**
3. Find the **Connection string** section
4. Select **"Transaction"** mode (important for Vercel serverless!)
5. Click **"URI"** tab
6. Copy the connection string

It should look like:
```
postgresql://postgres.yfvxwwayhlupnxhonhzi:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Note the format:**
- Host: `aws-0-[region].pooler.supabase.com` (NOT `db.xxx.supabase.co`)
- Port: `6543` (Transaction pooler port)
- Username: `postgres.[project-ref]`

### Step 2: Replace Password Placeholder

Replace `[YOUR-PASSWORD]` with your actual database password:
- If you don't remember it, reset it in Supabase Dashboard → Database Settings → Database Password

### Step 3: Add to Vercel Environment Variables

#### Option A: Using DATABASE_URL (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your full connection string from Step 2
   - **Environment:** Select all (Production, Preview, Development)

**Example:**
```
DATABASE_URL=postgresql://postgres.yfvxwwayhlupnxhonhzi:YourActualPassword123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
```

#### Option B: Using Individual Variables (Alternative)

If you prefer separate variables:

```
DB_HOST=aws-0-eu-central-1.pooler.supabase.com
DB_PORT=6543
DB_USERNAME=postgres.yfvxwwayhlupnxhonhzi
DB_PASSWORD=YourActualPassword123
DB_DATABASE=postgres
DB_SSL=true
```

### Step 4: Redeploy

After adding environment variables:

1. Go to **Deployments** tab in Vercel
2. Click the three dots on the latest deployment
3. Click **"Redeploy"**

Or push a new commit to trigger automatic deployment.

---

## Verification

After deployment, check the Vercel function logs:

**Success indicators:**
```
✅ Using DATABASE_URL for connection
🔧 Parsed Database Configuration: {
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  username: 'postgres.yf***',
  database: 'postgres',
  ssl: true
}
```

**Error indicators:**
- `ENOTFOUND db.xxx.supabase.co` → Using wrong host format
- `ETIMEDOUT` → Firewall/network issue
- `password authentication failed` → Wrong password

---

## Common Issues

### Issue 1: DNS Error (ENOTFOUND)
**Symptoms:** `getaddrinfo ENOTFOUND db.xxx.supabase.co`

**Solution:** You're using the old direct connection host. Use the Transaction pooler host instead:
- ❌ Wrong: `db.yfvxwwayhlupnxhonhzi.supabase.co`
- ✅ Correct: `aws-0-eu-central-1.pooler.supabase.com`

### Issue 2: Connection Timeout
**Symptoms:** `Connection timeout`

**Solution:**
1. Check that port is `6543` (not `5432`)
2. Verify SSL is enabled (`?sslmode=require` in URL)
3. Check Supabase project is not paused

### Issue 3: Authentication Failed
**Symptoms:** `password authentication failed`

**Solution:**
1. Reset database password in Supabase Dashboard
2. Update `DATABASE_URL` with new password
3. Make sure special characters in password are URL-encoded

### Issue 4: Wrong Username Format
**Symptoms:** `role "postgres" does not exist`

**Solution:** For pooler connections, username should be `postgres.[project-ref]`:
- ❌ Wrong: `postgres`
- ✅ Correct: `postgres.yfvxwwayhlupnxhonhzi`

---

## Why This Change?

**Old approach:**
- Used direct connection to `db.xxx.supabase.co:5432`
- Not optimized for serverless (limited connections)
- DNS resolution issues in some Vercel regions

**New approach:**
- Uses Supabase Connection Pooler
- Optimized for serverless with connection reuse
- More reliable DNS resolution via AWS infrastructure
- Better performance and scalability

---

## Testing Locally

To test locally before deploying:

1. Create/update `backend/.env`:
```bash
DATABASE_URL=postgresql://postgres.yfvxwwayhlupnxhonhzi:YourPassword@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

2. Run backend:
```bash
cd backend
npm install
npm run start:dev
```

3. Check logs for connection success

---

## Additional Resources

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [TypeORM Connection Options](https://typeorm.io/data-source-options)

---

## Support

If you continue to have connection issues:

1. Check Vercel function logs for exact error
2. Verify all environment variables are set correctly
3. Ensure Supabase project is active (not paused)
4. Try regenerating database password
