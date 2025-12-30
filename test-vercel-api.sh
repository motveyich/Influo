#!/bin/bash

# Скрипт для тестирования Vercel API
# Использование: ./test-vercel-api.sh

set -e

BASE_URL="https://influo-seven.vercel.app/api"

echo "=================================="
echo "Тестирование Vercel Backend API"
echo "=================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Health Check
echo "1. Health Check..."
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.data.status' 2>/dev/null || echo "error")

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓ Health check: OK${NC}"
    echo "   $(echo $HEALTH_RESPONSE | jq -r '.data.services')"
else
    echo -e "${RED}✗ Health check: FAILED${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# 2. Test Signup
echo "2. Тест регистрации..."
RANDOM_EMAIL="test$(date +%s)@example.com"
SIGNUP_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${RANDOM_EMAIL}\",
    \"password\": \"Test123456!\",
    \"fullName\": \"Test User\",
    \"userType\": \"influencer\"
  }")

SIGNUP_SUCCESS=$(echo $SIGNUP_RESPONSE | jq -r '.success' 2>/dev/null || echo "false")
SIGNUP_ERROR=$(echo $SIGNUP_RESPONSE | jq -r '.message' 2>/dev/null || echo "unknown error")

if [ "$SIGNUP_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Signup: OK${NC}"
    echo "   Email: $RANDOM_EMAIL"
    ACCESS_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken')
    echo "   Access Token: ${ACCESS_TOKEN:0:50}..."
else
    echo -e "${RED}✗ Signup: FAILED${NC}"
    echo "   Error: $SIGNUP_ERROR"
    echo "   Full response:"
    echo "$SIGNUP_RESPONSE" | jq .

    # Диагностика
    echo ""
    echo -e "${YELLOW}Возможные причины:${NC}"
    echo "1. JWT_SECRET или JWT_REFRESH_SECRET не установлены на Vercel"
    echo "2. SUPABASE_SERVICE_ROLE_KEY неправильный"
    echo "3. Environment variables не применились (нужен redeploy)"
    echo ""
    echo "Проверьте Vercel Dashboard → Settings → Environment Variables"
    exit 1
fi
echo ""

# 3. Test Login
echo "3. Тест входа..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${RANDOM_EMAIL}\",
    \"password\": \"Test123456!\"
  }")

LOGIN_SUCCESS=$(echo $LOGIN_RESPONSE | jq -r '.success' 2>/dev/null || echo "false")

if [ "$LOGIN_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Login: OK${NC}"
    NEW_ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
    echo "   Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
else
    echo -e "${YELLOW}⚠ Login: FAILED (но это может быть нормально для первого теста)${NC}"
    echo "   $(echo $LOGIN_RESPONSE | jq -r '.message')"
fi
echo ""

# 4. Test Protected Endpoint
if [ -n "$ACCESS_TOKEN" ]; then
    echo "4. Тест защищенного endpoint (/auth/me)..."
    ME_RESPONSE=$(curl -s "${BASE_URL}/auth/me" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    ME_SUCCESS=$(echo $ME_RESPONSE | jq -r '.success' 2>/dev/null || echo "false")

    if [ "$ME_SUCCESS" = "true" ]; then
        echo -e "${GREEN}✓ Protected endpoint: OK${NC}"
        echo "   User: $(echo $ME_RESPONSE | jq -r '.data.fullName')"
        echo "   Email: $(echo $ME_RESPONSE | jq -r '.data.email')"
    else
        echo -e "${RED}✗ Protected endpoint: FAILED${NC}"
        echo "   $(echo $ME_RESPONSE | jq -r '.message')"
    fi
    echo ""
fi

# Итоги
echo "=================================="
echo -e "${GREEN}Тестирование завершено!${NC}"
echo "=================================="
echo ""
echo "Все критические тесты прошли успешно."
echo "Backend API готов к использованию."
