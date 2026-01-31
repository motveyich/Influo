# Deployment Fix Guide - AI Assistant

## Issues Fixed

### 1. Validation Error (400 Bad Request)
- Made `userId` optional in `DeepSeekRequestDto`
- It's now populated from JWT token on backend

### 2. TypeScript Build Error
- Fixed `DealStage | undefined` type issues
- Added default value `DealStage.UNKNOWN` where needed

## Files Changed
- `backend/src/modules/ai-assistant/dto/deepseek-request.dto.ts`
- `backend/src/modules/ai-assistant/ai-assistant.service.ts`

## Deploy to Vercel

### Option 1: If Using Git
```bash
git add .
git commit -m "Fix AI Assistant validation and TypeScript errors"
git push
```

Vercel will automatically detect the changes and redeploy.

### Option 2: If Using Vercel CLI
```bash
cd backend
vercel --prod
```

### Option 3: Manual Upload via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments" tab
4. Click "Redeploy" on the latest deployment
5. Or manually upload the `backend` folder

## Verify Deployment

After deployment, test AI Assistant:

1. Open the chat with any user
2. Click on AI Assistant button
3. Try any of these features:
   - Summarize conversation
   - Analyze risks
   - Suggest reply
   - Check message
   - Get checklist

If you see a response instead of "400 Bad Request", the fix is working!

## Environment Variables

Make sure these are set in Vercel:
- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `SUPABASE_URL` - Your Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `JWT_SECRET` - Your JWT secret

## Troubleshooting

### Still Getting 400 Error
1. Clear browser cache
2. Check Network tab in DevTools
3. Verify JWT token is being sent
4. Check Vercel logs for backend errors

### Build Still Failing
1. Make sure NestJS dependencies are installed
2. Check `package.json` in backend folder
3. Verify TypeScript version compatibility

### DeepSeek API Not Working
1. Verify `DEEPSEEK_API_KEY` is set
2. Check API quota/limits
3. Test API key directly: https://api.deepseek.com/v1/chat/completions
