# Backend Deployment on Vercel

## Overview

This NestJS backend is configured to run as a Vercel Serverless Function.

## Configuration Files

### 1. `vercel.json`
- Defines the serverless function entry point at `api/index.ts`
- Routes all requests to the serverless function
- Sets production environment variables

### 2. `api/index.ts`
- Serverless function entry point
- Initializes NestJS application
- Caches the app instance for better cold start performance
- Handles CORS and security middleware

### 3. `.vercelignore`
- Excludes unnecessary files from deployment
- Reduces bundle size

## Environment Variables Required

Set these in Vercel Dashboard:

```
NODE_ENV=production
PORT=3001
API_PREFIX=api
FRONTEND_URL=https://your-frontend-url.vercel.app

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=3600
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRATION=604800

DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-reasoner
```

## Deployment Steps

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure environment variables in Vercel Dashboard
4. Deploy!

Or use Vercel CLI:

```bash
npm install -g vercel
cd backend
vercel --prod
```

## API Endpoints

Once deployed, your API will be available at:

- Base URL: `https://your-backend.vercel.app`
- API Docs: `https://your-backend.vercel.app/api/docs`
- Health Check: `https://your-backend.vercel.app/api/health`

## Testing

Test your deployment:

```bash
curl https://your-backend.vercel.app/api/health
```

## Important Notes

- **Cold Starts**: Serverless functions may have slower initial response times
- **Timeouts**: Vercel has a 10-second timeout for Hobby plan, 60 seconds for Pro
- **WebSockets**: Not supported in Vercel Serverless Functions
- **File System**: Only `/tmp` is writable

## Troubleshooting

### Build Fails
- Check that all dependencies are in `dependencies`, not `devDependencies`
- Verify TypeScript compiles successfully locally: `npm run build`

### Runtime Errors
- Check Vercel logs: `vercel logs <deployment-url>`
- Verify all environment variables are set correctly
- Check CORS configuration matches your frontend URL

### Database Connection Issues
- Verify Supabase credentials are correct
- Check that Supabase allows connections from Vercel IPs

## Alternative Platforms

If Vercel doesn't meet your needs, consider:
- **Railway**: Better for long-running processes
- **Render**: Free tier with persistent servers
- **Fly.io**: Global edge deployment
- **Heroku**: Traditional PaaS hosting
