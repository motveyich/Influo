# Быстрое исправление ошибки 401/500 на Vercel

## Проблема
Backend на Vercel возвращает ошибку 401 Unauthorized или 500 Internal Server Error при попытке регистрации.

## Причина
Отсутствуют обязательные environment variables на Vercel (JWT_SECRET, JWT_REFRESH_SECRET, SUPABASE_SERVICE_ROLE_KEY).

## Быстрое решение

### 1. Сгенерируйте JWT секреты

```bash
# Команда для генерации (выполните ДВАЖДЫ с разными результатами!)
openssl rand -base64 48
```

Сохраните оба значения отдельно.

### 2. Получите Supabase Service Role Key

1. Откройте: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/settings/api
2. Скопируйте **service_role** key (длинный JWT, начинается с `eyJhbGc...`)
3. НЕ используйте anon/public key!

### 3. Добавьте на Vercel

https://vercel.com/dashboard → ваш проект → Settings → Environment Variables

Добавьте эти 8 переменных для **Production**:

```
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key из шага 2>
JWT_SECRET=<первый сгенерированный секрет>
JWT_REFRESH_SECRET=<второй сгенерированный секрет>
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800
NODE_ENV=production
PORT=3001
```

### 4. Redeploy

1. Deployments → последний деплой → ••• → **Redeploy**
2. Подождите 2-3 минуты

### 5. Проверьте

```bash
# Автоматический тест
./test-vercel-api.sh

# Или вручную:
curl https://influo-seven.vercel.app/api/health
```

## Если все еще не работает

### Проверьте логи Vercel

1. Vercel Dashboard → ваш проект
2. Deployments → последний деплой
3. **Function Logs** или **Runtime Logs**
4. Ищите сообщения:
   - `❌ CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be configured!`
   - `✅ JWT configuration verified`
   - `✅ Supabase client initialized`

### Типичные ошибки

**Ошибка**: `Missing required JWT configuration`
- **Решение**: JWT_SECRET или JWT_REFRESH_SECRET не добавлены или не применились
- **Действие**: Проверьте Variables, сделайте redeploy

**Ошибка**: `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided`
- **Решение**: Supabase credentials не установлены
- **Действие**: Добавьте SUPABASE_SERVICE_ROLE_KEY (не anon key!)

**Ошибка**: `Failed to create user profile`
- **Решение**: Используется anon key вместо service_role key
- **Действие**: Проверьте что SUPABASE_SERVICE_ROLE_KEY - это действительно service_role

## Контрольный список

- [ ] Сгенерированы 2 разных JWT секрета
- [ ] Получен Supabase Service Role Key (не anon!)
- [ ] Добавлены все 8 переменных на Vercel
- [ ] Выбран environment "Production"
- [ ] Сделан Redeploy
- [ ] Health check работает
- [ ] Регистрация работает

## Дополнительные ресурсы

- Подробная инструкция: `VERCEL_ENV_SETUP.md`
- Тестовый скрипт: `./test-vercel-api.sh`
- Backend документация: `backend/README.md`
