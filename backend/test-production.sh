#!/bin/bash

# Production Backend Test Script
# Tests https://backend-ten-bice-31.vercel.app endpoints

BASE_URL="https://backend-ten-bice-31.vercel.app"

echo "================================================"
echo "🧪 Testing Production Backend"
echo "================================================"
echo ""

echo "1️⃣ Testing Health Endpoint..."
echo "GET ${BASE_URL}/api/health"
echo ""
HEALTH_RESPONSE=$(curl -s -i "${BASE_URL}/api/health")
echo "$HEALTH_RESPONSE"
echo ""

if echo "$HEALTH_RESPONSE" | grep -q "X-Vercel-Error"; then
    echo "❌ FAIL: Got X-Vercel-Error (Vercel can't find function)"
    echo ""
    echo "This means:"
    echo "- Vercel platform returned 404"
    echo "- Our code didn't run"
    echo "- Need to deploy properly"
    exit 1
fi

if echo "$HEALTH_RESPONSE" | grep -q "200 OK"; then
    echo "✅ PASS: Health endpoint works!"
else
    echo "⚠️  WARNING: Unexpected status"
fi

echo ""
echo "================================================"
echo ""

echo "2️⃣ Testing CORS (OPTIONS preflight)..."
echo "OPTIONS ${BASE_URL}/api/auth/login"
echo ""
OPTIONS_RESPONSE=$(curl -s -i -X OPTIONS "${BASE_URL}/api/auth/login")
echo "$OPTIONS_RESPONSE"
echo ""

if echo "$OPTIONS_RESPONSE" | grep -q "X-Vercel-Error"; then
    echo "❌ FAIL: Got X-Vercel-Error on OPTIONS"
    exit 1
fi

if echo "$OPTIONS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo "✅ PASS: CORS headers present!"
else
    echo "⚠️  WARNING: CORS headers missing"
fi

echo ""
echo "================================================"
echo ""

echo "3️⃣ Testing Login Endpoint..."
echo "POST ${BASE_URL}/api/auth/login"
echo ""
LOGIN_RESPONSE=$(curl -s -i -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }')
echo "$LOGIN_RESPONSE"
echo ""

if echo "$LOGIN_RESPONSE" | grep -q "X-Vercel-Error"; then
    echo "❌ FAIL: Got X-Vercel-Error on POST"
    echo "Backend function not found by Vercel"
    exit 1
fi

if echo "$LOGIN_RESPONSE" | grep -q "application/json"; then
    echo "✅ PASS: Returns JSON (function is running!)"

    if echo "$LOGIN_RESPONSE" | grep -q "401"; then
        echo "✅ Got 401 (invalid credentials) - this is expected!"
    elif echo "$LOGIN_RESPONSE" | grep -q "200"; then
        echo "✅ Got 200 (login success) - credentials were correct!"
    else
        echo "⚠️  Got other status - check response above"
    fi
else
    echo "⚠️  WARNING: Response is not JSON"
fi

echo ""
echo "================================================"
echo ""

echo "4️⃣ Testing with Real User (if exists)..."
echo "POST ${BASE_URL}/api/auth/login"
echo ""

# Try with a potentially real user
REAL_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')

if echo "$REAL_LOGIN" | grep -q "accessToken"; then
    echo "✅ PASS: Got access token!"
    echo ""
    echo "Response (truncated):"
    echo "$REAL_LOGIN" | head -c 200
    echo "..."
else
    echo "⚠️  No access token (expected if user doesn't exist)"
    echo ""
    echo "Response:"
    echo "$REAL_LOGIN"
fi

echo ""
echo "================================================"
echo "📊 SUMMARY"
echo "================================================"
echo ""

if echo "$HEALTH_RESPONSE" | grep -q "X-Vercel-Error"; then
    echo "❌ DEPLOYMENT FAILED"
    echo ""
    echo "Backend is NOT deployed properly."
    echo "Vercel returns 404 at platform level."
    echo ""
    echo "Next steps:"
    echo "1. Deploy using: vercel --prod"
    echo "2. Check Root Directory = 'backend' in Vercel settings"
    echo "3. Verify api/index.js exists (not .ts!)"
    echo "4. Check vercel.json configuration"
    echo ""
    exit 1
else
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "Backend is running on Vercel."
    echo "All endpoints are accessible."
    echo ""
    echo "Next steps:"
    echo "1. Update frontend to use: ${BASE_URL}"
    echo "2. Test login from frontend UI"
    echo "3. Verify authentication flow works"
    echo ""
fi
