#!/bin/bash

echo "🚀 Deploying Backend to Vercel..."
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Make sure you're in the backend directory"
  exit 1
fi

# Build the project first
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix the errors above."
  exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo ""
echo "When prompted:"
echo "  - Set up and deploy? → Y"
echo "  - Which scope? → Select your account"
echo "  - Link to existing project? → N"
echo "  - Project name? → backend (or any name you want)"
echo "  - In which directory? → ./"
echo ""

npx vercel --prod

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "📋 Next steps:"
  echo "1. Copy the deployment URL (something like: https://backend-xyz.vercel.app)"
  echo "2. Go to Vercel Dashboard and add environment variables:"
  echo "   https://vercel.com/dashboard"
  echo "   - SUPABASE_URL"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - SUPABASE_ANON_KEY"
  echo "   - JWT_SECRET"
  echo "   - JWT_REFRESH_SECRET"
  echo "   - FRONTEND_ORIGIN=*"
  echo "   - NODE_ENV=production"
  echo ""
  echo "3. After adding env vars, redeploy the project"
  echo "4. Update frontend .env with your backend URL"
else
  echo ""
  echo "❌ Deployment failed. Please check the errors above."
fi
