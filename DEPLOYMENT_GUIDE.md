# Deployment Guide: Frontend → Backend → Supabase Architecture

This guide explains how to deploy your application with the correct architecture: **Frontend → Backend → Supabase**.

## Architecture Overview

```
Frontend (Vercel) → Backend (Vercel) → Supabase Database
```

- **Frontend**: React application that makes HTTP requests to the backend API
- **Backend**: NestJS serverless functions on Vercel that handle all business logic
- **Supabase**: Database and authentication service (accessed only by backend with service role key)

## Backend Deployment to Vercel

### 1. Prepare Backend for Deployment

The backend is already configured for Vercel serverless deployment with:
- `backend/api/index.ts` - Serverless function entry point
- `backend/vercel.json` - Vercel configuration

### 2. Deploy Backend to Vercel

```bash
cd backend
vercel
```

Follow the prompts to create a new project or link to existing one.

### 3. Configure Backend Environment Variables

In Vercel dashboard for your backend project, add these environment variables:

**Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (⚠️ NEVER use anon key here!)
- `JWT_SECRET` - A strong secret key (min 32 characters)
- `JWT_REFRESH_SECRET` - Another strong secret key
- `FRONTEND_ORIGIN` - Your frontend URL (e.g., `https://yourapp.vercel.app`)

**Optional:**
- `API_PREFIX` - Default: `api`
- `JWT_EXPIRATION` - Default: `3600` (1 hour)
- `JWT_REFRESH_EXPIRATION` - Default: `604800` (7 days)

### 4. Verify Backend Health

After deployment, test the backend:

```bash
curl https://your-backend.vercel.app/api/health
```

You should get:
```json
{
  "status": "ok",
  "message": "API is healthy",
  "timestamp": "2024-12-11T..."
}
```

## Frontend Deployment to Vercel

### 1. Configure Frontend Environment Variables

In Vercel dashboard for your frontend project, add:

**Required:**
- `VITE_API_URL` - Your backend API URL (e.g., `https://your-backend.vercel.app/api`)
- `VITE_SUPABASE_URL` - Your Supabase project URL (for realtime only)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key (for realtime only)

**Optional:**
- `VITE_APP_ENV` - `production` or `development`

### 2. Deploy Frontend

```bash
vercel
```

## Local Development

### Backend Local Setup

1. Create `backend/.env`:
```env
NODE_ENV=development
PORT=3001
API_PREFIX=api
FRONTEND_ORIGIN=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

JWT_SECRET=your_strong_jwt_secret_min_32_chars
JWT_EXPIRATION=3600
JWT_REFRESH_SECRET=your_strong_refresh_secret_min_32_chars
JWT_REFRESH_EXPIRATION=604800
```

2. Install and run:
```bash
cd backend
npm install
npm run start:dev
```

Backend will run at `http://localhost:3001/api`

### Frontend Local Setup

1. Create `.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_ENV=development
```

2. Install and run:
```bash
npm install
npm run dev
```

Frontend will run at `http://localhost:5173`

## API Endpoints

Backend provides these main endpoints:

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Profiles
- `GET /api/profiles/:id` - Get user profile
- `PATCH /api/profiles/:id` - Update user profile
- `POST /api/profiles/:id/avatar` - Upload avatar
- `GET /api/profiles/:id/completion` - Get profile completion
- `GET /api/profiles?q=search` - Search profiles

### Influencer Cards
- `GET /api/influencer-cards` - List all cards
- `GET /api/influencer-cards/:id` - Get card by ID
- `POST /api/influencer-cards` - Create new card
- `PATCH /api/influencer-cards/:id` - Update card
- `DELETE /api/influencer-cards/:id` - Delete card

### Advertiser Cards
- `GET /api/advertiser-cards` - List all cards
- `GET /api/advertiser-cards/:id` - Get card by ID
- `POST /api/advertiser-cards` - Create new card
- `PATCH /api/advertiser-cards/:id` - Update card
- `DELETE /api/advertiser-cards/:id` - Delete card

### Auto Campaigns
- `GET /api/auto-campaigns` - List campaigns
- `GET /api/auto-campaigns/:id` - Get campaign by ID
- `POST /api/auto-campaigns` - Create campaign
- `PATCH /api/auto-campaigns/:id` - Update campaign
- `DELETE /api/auto-campaigns/:id` - Delete campaign

### Offers
- `GET /api/offers` - List offers
- `GET /api/offers/:id` - Get offer by ID
- `POST /api/offers` - Create offer
- `PATCH /api/offers/:id` - Update offer status

### And many more...

Full API documentation available at: `https://your-backend.vercel.app/api/docs` (Swagger UI)

## Security Considerations

### ⚠️ CRITICAL SECURITY RULES

1. **NEVER expose service role key on frontend**
   - Service role key must ONLY be in backend environment variables
   - Frontend should only have anon key for Supabase realtime (optional)

2. **All database operations go through backend**
   - Frontend NEVER makes direct calls to Supabase REST API
   - All CRUD operations are handled by backend endpoints
   - Backend uses service role key to bypass RLS when needed

3. **Authentication flow**
   - User logs in through backend `/api/auth/login`
   - Backend returns JWT access token and refresh token
   - Frontend stores tokens and includes in subsequent requests
   - Backend validates JWT and enforces authorization

4. **CORS Configuration**
   - Backend allows requests only from your frontend domain
   - Configure `FRONTEND_ORIGIN` environment variable correctly

## Troubleshooting

### Backend returns 404

- Check `backend/vercel.json` is present
- Verify `backend/api/index.ts` exports default handler
- Check Vercel logs for errors

### CORS errors

- Verify `FRONTEND_ORIGIN` is set correctly in backend env variables
- Ensure frontend URL matches exactly (with/without trailing slash)

### Authentication not working

- Verify `JWT_SECRET` is set in backend
- Check that frontend is sending token in `Authorization: Bearer <token>` header
- Verify backend `/api/auth/me` endpoint works

### Database operations fail

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly in backend
- Check Supabase connection in backend logs
- Test `/api/health` endpoint

## Testing the Complete Flow

1. **Test backend health:**
   ```bash
   curl https://your-backend.vercel.app/api/health
   ```

2. **Test registration:**
   ```bash
   curl -X POST https://your-backend.vercel.app/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","userType":"influencer"}'
   ```

3. **Test login:**
   ```bash
   curl -X POST https://your-backend.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

4. **Test protected endpoint:**
   ```bash
   curl https://your-backend.vercel.app/api/auth/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

5. **Check Network tab in browser:**
   - Open DevTools → Network
   - All API requests should go to `your-backend.vercel.app`
   - NO requests should go directly to `*.supabase.co` (except for realtime subscriptions)

## Success Criteria

✅ Backend deployed and accessible at `/api/health`
✅ Frontend makes NO direct calls to Supabase REST API
✅ All CRUD operations go through backend
✅ Authentication works through backend JWT tokens
✅ CORS configured correctly
✅ Service role key ONLY in backend environment
✅ Frontend only has anon key for realtime (if needed)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test backend endpoints individually with curl
4. Check browser Network tab for CORS or 404 errors
