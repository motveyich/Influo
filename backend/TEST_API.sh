#!/bin/bash

# Backend API Test Script
# Tests the Vercel deployment to ensure all endpoints work

BACKEND_URL="${1:-https://influo-seven.vercel.app/}"

echo "🧪 Testing Backend API: $BACKEND_URL"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/health")
status_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$status_code" = "200" ]; then
  echo "✅ Health check passed"
  echo "Response: $body"
else
  echo "❌ Health check failed (Status: $status_code)"
  echo "Response: $body"
fi
echo ""

# Test 2: Root endpoint
echo "2️⃣ Testing Root Endpoint..."
response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api")
status_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$status_code" = "200" ]; then
  echo "✅ Root endpoint passed"
  echo "Response: $body"
else
  echo "❌ Root endpoint failed (Status: $status_code)"
  echo "Response: $body"
fi
echo ""

# Test 3: OPTIONS preflight (CORS)
echo "3️⃣ Testing CORS Preflight..."
response=$(curl -s -w "\n%{http_code}" -X OPTIONS "$BACKEND_URL/api/auth/login" \
  -H "Origin: https://influo-seven.vercel.app/" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type")
status_code=$(echo "$response" | tail -n 1)

if [ "$status_code" = "200" ] || [ "$status_code" = "204" ]; then
  echo "✅ CORS preflight passed"
else
  echo "❌ CORS preflight failed (Status: $status_code)"
fi
echo ""

# Test 4: Login endpoint (should return 400/401 without valid credentials)
echo "4️⃣ Testing Login Endpoint..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}')
status_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

# We expect 400 or 401 since credentials are invalid
if [ "$status_code" = "400" ] || [ "$status_code" = "401" ]; then
  echo "✅ Login endpoint is accessible (returned $status_code as expected)"
  echo "Response: $body"
elif [ "$status_code" = "404" ]; then
  echo "❌ Login endpoint returned 404 - ROUTE NOT FOUND!"
  echo "Response: $body"
else
  echo "⚠️  Login endpoint returned unexpected status: $status_code"
  echo "Response: $body"
fi
echo ""

# Test 5: Signup endpoint
echo "5️⃣ Testing Signup Endpoint..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","userType":"influencer"}')
status_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

# We expect 400/409 (user exists or validation error)
if [ "$status_code" = "400" ] || [ "$status_code" = "409" ] || [ "$status_code" = "201" ]; then
  echo "✅ Signup endpoint is accessible (returned $status_code)"
  echo "Response: $body"
elif [ "$status_code" = "404" ]; then
  echo "❌ Signup endpoint returned 404 - ROUTE NOT FOUND!"
  echo "Response: $body"
else
  echo "⚠️  Signup endpoint returned unexpected status: $status_code"
  echo "Response: $body"
fi
echo ""

# Summary
echo "=========================================="
echo "✅ Test Complete!"
echo ""
echo "If you see 404 errors above, the routing is broken."
echo "If you see 400/401 errors, the routing works (just need valid credentials)."
echo ""
echo "To test with valid credentials, use:"
echo "curl -X POST $BACKEND_URL/api/auth/signup \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\",\"userType\":\"influencer\"}'"
