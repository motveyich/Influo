# Production Deployment Guide

## Prerequisites

- Vercel account
- Supabase project
- GitHub repository (optional but recommended)

## Step 1: Environment Variables

### Required Variables

Create these in Vercel Dashboard → Project Settings → Environment Variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-very-secure-random-string-min-32-chars
JWT_REFRESH_SECRET=another-very-secure-random-string

# Application Configuration
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app

# Optional: Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
```

### Generate Secure Secrets

```bash
# Generate JWT secrets (32+ characters recommended)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 2: Prepare Backend for Deployment

### 1. Build Test
```bash
cd backend
npm install
npm run build
```

### 2. Update vercel.json

Ensure your `vercel.json` is configured:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/main.js",
      "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Add Build Script

Ensure `package.json` has:

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  }
}
```

## Step 3: Deploy to Vercel

### Option A: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from backend directory
cd backend
vercel --prod

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No (first time)
# - Project name? influo-backend
# - Directory? ./
# - Override settings? No
```

### Option B: Via GitHub Integration

1. Push code to GitHub
2. Go to vercel.com
3. Click "New Project"
4. Import your repository
5. Configure:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables
7. Click "Deploy"

### Option C: Via Vercel Dashboard

1. Go to vercel.com
2. Click "Add New" → "Project"
3. Import from Git or upload files
4. Configure as in Option B
5. Deploy

## Step 4: Configure Supabase

### 1. Update Supabase URL Whitelist

In Supabase Dashboard → Settings → API:
- Add your Vercel deployment URL to allowed origins

### 2. Verify RLS Policies

Ensure all RLS policies are active:

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should have rowsecurity = true
```

### 3. Test Database Connection

```bash
# Test from deployed app
curl https://your-backend.vercel.app/api/health
```

## Step 5: Post-Deployment Verification

### Health Check
```bash
curl https://your-backend.vercel.app/api/health
# Expected: { "status": "ok", "timestamp": "..." }
```

### API Documentation
Visit: `https://your-backend.vercel.app/api/docs`

### Test Authentication
```bash
# Test signup
curl -X POST https://your-backend.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "fullName": "Test User",
    "userType": "influencer"
  }'

# Test login
curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Test Protected Endpoints
```bash
TOKEN="your-jwt-token-from-login"

curl https://your-backend.vercel.app/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Step 6: Configure Frontend

Update frontend environment variables:

```env
# .env.production
VITE_API_URL=https://your-backend.vercel.app/api
```

Deploy frontend separately or as part of monorepo.

## Step 7: Monitoring & Logging

### Vercel Logs
Access logs in Vercel Dashboard → Deployments → Click deployment → Logs

### Error Tracking

Consider adding Sentry:

```bash
npm install @sentry/node
```

```typescript
// main.ts
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
  });
}
```

### Performance Monitoring

Monitor with Vercel Analytics:
- Response times
- Error rates
- Request volume
- Geographic distribution

## Step 8: Security Hardening

### 1. CORS Configuration

Update in `main.ts`:

```typescript
app.enableCors({
  origin: [
    process.env.FRONTEND_URL,
    'https://your-production-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
```

### 2. Rate Limiting

Configured in `app.module.ts`:

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute (adjust as needed)
  },
]),
```

### 3. Security Headers

Already configured with Helmet in `main.ts`.

## Step 9: Database Backups

### Automated Backups (Supabase)

Supabase Pro plan includes:
- Daily automated backups
- Point-in-time recovery
- Manual backup creation

### Manual Backup

```bash
# Using pg_dump
pg_dump "postgresql://user:pass@host:5432/database" > backup.sql
```

## Step 10: Scaling Considerations

### Serverless Limits (Vercel)

- **Execution timeout**: 10s (Hobby), 60s (Pro), 900s (Enterprise)
- **Payload size**: 4.5MB
- **Memory**: 1024MB (Hobby), 3008MB (Pro)

### Database Connection Pooling

Supabase handles connection pooling automatically.

### Caching Strategy

Consider adding Redis (Upstash) for:
- Session storage
- Rate limiting
- Response caching

```bash
npm install @upstash/redis
```

## Troubleshooting

### Issue: 502 Bad Gateway
**Cause**: Build failed or incorrect vercel.json
**Solution**: Check build logs, verify vercel.json configuration

### Issue: 401 Unauthorized on all requests
**Cause**: JWT_SECRET mismatch
**Solution**: Verify environment variables match between frontend/backend

### Issue: CORS errors
**Cause**: Origin not whitelisted
**Solution**: Update CORS configuration in main.ts

### Issue: Database connection fails
**Cause**: Incorrect Supabase credentials
**Solution**: Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

### Issue: Slow response times
**Cause**: Cold starts or unoptimized queries
**Solution**:
- Keep functions warm with periodic pings
- Optimize database queries
- Add indexes to frequently queried columns

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: cd backend && npm install
      - run: cd backend && npm run test
      - run: cd backend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./backend
```

## Rollback Strategy

### Instant Rollback

Vercel allows instant rollback to previous deployment:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Manual Rollback

```bash
# Revert to specific commit
git revert HEAD
git push origin main

# Or force push previous commit
git reset --hard <previous-commit-hash>
git push --force origin main
```

## Maintenance Mode

Create a maintenance page:

```typescript
// main.ts
if (process.env.MAINTENANCE_MODE === 'true') {
  app.use((req, res) => {
    res.status(503).json({
      message: 'Service temporarily unavailable',
    });
  });
}
```

## Cost Optimization

### Vercel Pricing
- **Hobby**: Free (100GB bandwidth, 100 hours serverless execution)
- **Pro**: $20/month (1TB bandwidth, 1000 hours execution)

### Supabase Pricing
- **Free**: 500MB database, 1GB file storage
- **Pro**: $25/month (8GB database, 100GB storage)

### Recommendations
- Start with free tiers
- Monitor usage
- Upgrade as needed
- Optimize queries to reduce database load
- Use caching to reduce API calls

## Production Checklist

- [ ] Environment variables configured
- [ ] Build succeeds locally
- [ ] All tests passing
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Security headers enabled
- [ ] Error tracking configured
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Frontend pointing to production API
- [ ] SSL/TLS certificate valid
- [ ] API documentation accessible
- [ ] Health check endpoint working

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **NestJS Docs**: https://docs.nestjs.com
- **Community**: Discord, GitHub Issues

## Next Steps After Deployment

1. Monitor error rates and performance
2. Set up alerts for downtime
3. Plan for scaling based on usage
4. Gather user feedback
5. Iterate on features
6. Keep dependencies updated
7. Regular security audits
