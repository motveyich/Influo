#!/bin/bash

# Test Authentication Flow
echo "Testing Authentication Flow..."
echo ""

# Read API URL from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

API_URL="${VITE_API_BASE_URL:-https://influo-seven.vercel.app/api}"

echo "API URL: $API_URL"
echo ""

# Generate random test email
RANDOM_ID=$RANDOM
TEST_EMAIL="test_${RANDOM_ID}@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_USERNAME="testuser${RANDOM_ID}"

echo "=== Test 1: Sign Up ==="
echo "Email: $TEST_EMAIL"
echo "Password: $TEST_PASSWORD"
echo "Username: $TEST_USERNAME"
echo ""

SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"username\": \"$TEST_USERNAME\",
    \"fullName\": \"Test User\",
    \"userType\": \"influencer\"
  }")

echo "Response:"
echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)

if [ "$ACCESS_TOKEN" != "null" ] && [ ! -z "$ACCESS_TOKEN" ]; then
  echo "✅ Sign up successful! Access token received."
  echo ""

  echo "=== Test 2: Get Current User ==="
  ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "Response:"
  echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"
  echo ""

  echo "=== Test 3: Sign In ==="
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"$TEST_PASSWORD\"
    }")

  echo "Response:"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  echo ""

  NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)

  if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ ! -z "$NEW_ACCESS_TOKEN" ]; then
    echo "✅ Sign in successful!"
    echo ""
    echo "=== All tests passed! ==="
  else
    echo "❌ Sign in failed!"
  fi
else
  echo "❌ Sign up failed!"
  echo "Check if the backend is running and accessible at: $API_URL"
fi

echo ""
echo "=== Test Complete ==="
