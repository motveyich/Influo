#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверяем аргумент
if [ -z "$1" ]; then
    echo -e "${RED}❌ Ошибка: Не указан URL backend${NC}"
    echo ""
    echo "Использование:"
    echo "  ./test-backend.sh https://ваш-backend.vercel.app"
    echo ""
    exit 1
fi

BACKEND_URL="$1"
# Убираем trailing slash
BACKEND_URL="${BACKEND_URL%/}"

echo ""
echo "🧪 Тестирование Backend API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}1. Проверка Health Endpoint...${NC}"
response=$(curl -s "$BACKEND_URL/api/health")
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Health check успешен (HTTP $http_code)${NC}"
    echo "Response: $response"

    # Проверяем JWT секрет
    if echo "$response" | grep -q '"hasJwtSecret":true'; then
        echo -e "${GREEN}✅ JWT секрет настроен${NC}"
    else
        echo -e "${RED}❌ JWT секрет НЕ настроен! Добавьте JWT_SECRET в Environment Variables!${NC}"
    fi
else
    echo -e "${RED}❌ Health check failed (HTTP $http_code)${NC}"
    echo "Response: $response"
fi

echo ""

# Test 2: CORS Preflight
echo -e "${YELLOW}2. Проверка CORS (preflight)...${NC}"
cors_response=$(curl -s -X OPTIONS "$BACKEND_URL/api/auth/login" \
    -H "Origin: https://bolt.new" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type" \
    -i 2>&1 | grep -i "access-control")

if [ ! -z "$cors_response" ]; then
    echo -e "${GREEN}✅ CORS headers найдены${NC}"
    echo "$cors_response"
else
    echo -e "${RED}❌ CORS headers не найдены!${NC}"
    echo "Убедитесь что FRONTEND_URL настроен в Environment Variables"
fi

echo ""

# Test 3: Signup
echo -e "${YELLOW}3. Тест регистрации...${NC}"
random_email="test_$(date +%s)@example.com"
signup_response=$(curl -s -X POST "$BACKEND_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -H "Origin: https://bolt.new" \
    -d "{
        \"email\": \"$random_email\",
        \"password\": \"Test123456\",
        \"role\": \"influencer\"
    }")
signup_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -H "Origin: https://bolt.new" \
    -d "{
        \"email\": \"$random_email\",
        \"password\": \"Test123456\",
        \"role\": \"influencer\"
    }")

if [ "$signup_code" = "201" ] || [ "$signup_code" = "200" ]; then
    echo -e "${GREEN}✅ Регистрация успешна (HTTP $signup_code)${NC}"
    echo "Email: $random_email"
else
    echo -e "${RED}❌ Регистрация failed (HTTP $signup_code)${NC}"
    echo "Response: $signup_response"
fi

echo ""

# Test 4: Login
echo -e "${YELLOW}4. Тест логина...${NC}"
login_response=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "Origin: https://bolt.new" \
    -d "{
        \"email\": \"$random_email\",
        \"password\": \"Test123456\"
    }")
login_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "Origin: https://bolt.new" \
    -d "{
        \"email\": \"$random_email\",
        \"password\": \"Test123456\"
    }")

if [ "$login_code" = "200" ] || [ "$login_code" = "201" ]; then
    echo -e "${GREEN}✅ Логин успешен (HTTP $login_code)${NC}"

    # Проверяем наличие токена
    if echo "$login_response" | grep -q "accessToken"; then
        echo -e "${GREEN}✅ Access token получен${NC}"
    else
        echo -e "${RED}❌ Access token не найден в ответе${NC}"
    fi
else
    echo -e "${RED}❌ Логин failed (HTTP $login_code)${NC}"
    echo "Response: $login_response"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Тестирование завершено!${NC}"
echo ""

# Итоговая проверка
if [ "$http_code" = "200" ] && [ "$login_code" = "200" ]; then
    echo -e "${GREEN}✅ Backend работает правильно!${NC}"
    echo ""
    echo "Следующие шаги:"
    echo "1. Обновите .env файл frontend:"
    echo "   VITE_API_BASE_URL=$BACKEND_URL/api"
    echo ""
    echo "2. Перезагрузите frontend"
    echo ""
    echo "3. Попробуйте залогиниться в приложении"
else
    echo -e "${RED}⚠️ Есть проблемы с backend!${NC}"
    echo ""
    echo "Проверьте:"
    echo "- Environment Variables на Vercel"
    echo "- JWT_SECRET и JWT_REFRESH_SECRET установлены"
    echo "- FRONTEND_URL=https://bolt.new установлен"
    echo "- Deployment прошел успешно"
fi

echo ""
