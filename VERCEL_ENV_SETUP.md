# Настройка Environment Variables на Vercel

## Проблема

Backend на Vercel возвращает **500 Internal Server Error** при регистрации. Это происходит из-за отсутствия критически важных environment variables.

## Решение

### Шаг 1: Генерация JWT секретов

Выполните в терминале (на вашем компьютере):

```bash
# Генерация JWT_SECRET
openssl rand -base64 48

# Генерация JWT_REFRESH_SECRET (выполните еще раз!)
openssl rand -base64 48
```

Сохраните оба значения - они должны быть разными!

### Шаг 2: Получение Supabase Service Role Key

1. Откройте: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/settings/api
2. Найдите раздел **"Project API keys"**
3. Скопируйте **service_role** key (это длинный JWT токен)
   - НЕ используйте `anon` / `public` key!
   - Service role key начинается с `eyJhbGc...`

### Шаг 3: Добавление переменных на Vercel

1. Откройте: https://vercel.com/dashboard
2. Выберите ваш проект (influo-seven)
3. Перейдите в **Settings → Environment Variables**
4. Добавьте следующие переменные:

```env
# Обязательные переменные
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<ваш service_role key из Supabase>
JWT_SECRET=<первый сгенерированный секрет>
JWT_REFRESH_SECRET=<второй сгенерированный секрет>
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800
NODE_ENV=production
PORT=3001
```

Для каждой переменной:
- Нажмите **"Add New"**
- **Name**: имя переменной (например, `JWT_SECRET`)
- **Value**: значение переменной
- **Environment**: выберите **Production** (можно также Preview и Development)
- Нажмите **"Save"**

### Шаг 4: Redeploy приложения

После добавления ВСЕХ переменных:

1. Перейдите в **Deployments**
2. Найдите последний деплой
3. Нажмите три точки (•••) → **"Redeploy"**
4. Дождитесь завершения деплоя (2-3 минуты)

### Шаг 5: Проверка

После redeploy выполните тесты:

```bash
# 1. Health check (должен вернуть статус healthy)
curl https://influo-seven.vercel.app/api/health

# 2. Тест регистрации (должен вернуть токены)
curl -X POST https://influo-seven.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "fullName": "Test User",
    "userType": "influencer"
  }'
```

Если все настроено правильно, второй запрос вернет:
```json
{
  "success": true,
  "data": {
    "user": {...},
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

## Диагностика проблем

### Ошибка: "Missing required JWT configuration"

В логах Vercel вы увидите:
```
❌ CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be configured!
```

**Решение**: Убедитесь, что JWT_SECRET и JWT_REFRESH_SECRET добавлены в Environment Variables и сделан redeploy.

### Ошибка: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided"

**Решение**: Добавьте Supabase credentials в Environment Variables.

### Ошибка 500 при регистрации

**Возможные причины**:
1. JWT секреты не установлены
2. Supabase Service Role Key неправильный (используется anon key вместо service_role)
3. Environment variables не применились после изменения (нужен redeploy)

### Как посмотреть логи Vercel

1. Откройте проект на Vercel
2. Перейдите в **Deployments**
3. Кликните на последний деплой
4. Перейдите на вкладку **"Function Logs"** или **"Runtime Logs"**
5. Ищите сообщения с префиксом `[AuthService]` или `[SupabaseService]`

## Важные замечания

1. **Service Role Key vs Anon Key**:
   - Service Role Key - для backend (обходит RLS)
   - Anon Key - для frontend (используется в .env проекта)

2. **JWT секреты должны быть разными**:
   - JWT_SECRET используется для access токенов
   - JWT_REFRESH_SECRET используется для refresh токенов

3. **После изменения environment variables ОБЯЗАТЕЛЬНО делайте redeploy**!

4. **Не коммитьте секреты в git**:
   - Все чувствительные данные только в Vercel Environment Variables
   - В репозитории только `.env.example` с примерами

## Контрольный список

- [ ] Сгенерированы JWT_SECRET и JWT_REFRESH_SECRET
- [ ] Получен Supabase Service Role Key (не anon key!)
- [ ] Все 8 переменных добавлены в Vercel Environment Variables
- [ ] Выбран environment "Production" для каждой переменной
- [ ] Сделан redeploy приложения
- [ ] Проверен health endpoint (возвращает 200)
- [ ] Проверен signup endpoint (возвращает токены)
