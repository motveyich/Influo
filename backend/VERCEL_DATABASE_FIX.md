# Fix Backend Database Connection on Vercel

## Problem

Backend на Vercel выдает ошибку `ECONNREFUSED 127.0.0.1:5432` потому что пытается подключиться к локальной базе данных, которой нет в serverless окружении.

## Solution

Нужно добавить переменные окружения для подключения к Supabase PostgreSQL в Vercel.

---

## Шаг 1: Получите данные подключения из Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект `yfvxwwayhlupnxhonhzi`
3. Перейдите в **Project Settings** → **Database**
4. Найдите раздел **Connection Pooling**
5. Выберите режим **Transaction** (оптимально для Vercel)
6. Скопируйте Connection String, он выглядит так:

```
postgresql://postgres.yfvxwwayhlupnxhonhzi:[YOUR-PASSWORD]@db.yfvxwwayhlupnxhonhzi.supabase.co:6543/postgres
```

Из этой строки извлеките:
- **DB_HOST**: `db.yfvxwwayhlupnxhonhzi.supabase.co`
- **DB_PORT**: `6543` (для Transaction pooler)
- **DB_USERNAME**: `postgres.yfvxwwayhlupnxhonhzi`
- **DB_PASSWORD**: ваш пароль базы данных
- **DB_DATABASE**: `postgres`

---

## Шаг 2: Добавьте переменные окружения в Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект `influo-seven` (ваш backend проект)
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте следующие переменные:

### Обязательные переменные для базы данных:

```env
DB_HOST=db.yfvxwwayhlupnxhonhzi.supabase.co
DB_PORT=6543
DB_USERNAME=postgres.yfvxwwayhlupnxhonhzi
DB_PASSWORD=ваш_пароль_из_supabase
DB_DATABASE=postgres
DB_SSL=true
```

### Проверьте наличие остальных переменных:

```env
NODE_ENV=production
FRONTEND_URL=https://influo-nxw6rnp9w-matveys-projects-0d62e667.vercel.app
SUPABASE_URL=https://yfvxwwayhlupnxhonhzi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
JWT_SECRET=ваш_jwt_secret
JWT_REFRESH_SECRET=ваш_jwt_refresh_secret
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800
```

**ВАЖНО**: Установите переменные для всех окружений (Production, Preview, Development)

---

## Шаг 3: Найдите пароль базы данных

Если вы не помните пароль базы данных:

1. В Supabase Dashboard → **Project Settings** → **Database**
2. Найдите раздел **Database Password**
3. Если не знаете пароль, нажмите **Reset Database Password**
4. Скопируйте новый пароль (он покажется только один раз!)
5. Используйте этот пароль для переменной `DB_PASSWORD` в Vercel

---

## Шаг 4: Redeploy Backend

После добавления переменных окружения:

1. В Vercel Dashboard перейдите на вкладку **Deployments**
2. Нажмите на последний деплоймент
3. Нажмите **"Redeploy"** (три точки → Redeploy)
4. Или сделайте `git push` чтобы триггернуть новый деплоймент

---

## Шаг 5: Проверьте работу

### Проверьте логи Vercel:

1. Откройте **Deployments** → выберите последний деплоймент
2. Перейдите на вкладку **Runtime Logs**
3. Вы должны увидеть:
   ```
   🔧 Database Configuration: {
     host: 'db.yfvxwwayhlupnxhonhzi.supabase.co',
     port: 6543,
     username: 'postgres.yfvxwwayhlupnxhonhzi',
     database: 'postgres',
     ssl: true
   }
   ✅ NestJS initialized for Vercel
   ```

### Проверьте работу API:

```bash
# Проверка авторизации
curl -X POST https://influo-seven.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "yourpassword"
  }'
```

Если все работает, вы получите JWT токен вместо CORS ошибки.

---

## Troubleshooting

### Ошибка: "password authentication failed"

**Причина**: Неверный пароль в `DB_PASSWORD`

**Решение**:
1. Сбросьте пароль в Supabase Dashboard
2. Обновите переменную `DB_PASSWORD` в Vercel
3. Redeploy

### Ошибка: "connection timeout"

**Причина**: Неверный хост или порт

**Решение**:
1. Проверьте что `DB_HOST` = `db.yfvxwwayhlupnxhonhzi.supabase.co`
2. Проверьте что `DB_PORT` = `6543` (не `5432`!)
3. Redeploy

### Ошибка: "database does not exist"

**Причина**: Неверное имя базы данных

**Решение**:
1. Установите `DB_DATABASE=postgres` (стандартное имя в Supabase)
2. Redeploy

### CORS ошибки все еще есть

**Причина**: Backend все еще не отвечает

**Решение**:
1. Проверьте Runtime Logs на наличие других ошибок
2. Убедитесь что все переменные окружения добавлены
3. Убедитесь что сделали Redeploy после добавления переменных

---

## Полный чеклист переменных окружения

Убедитесь что в Vercel есть ВСЕ эти переменные:

- ✅ `NODE_ENV=production`
- ✅ `DB_HOST=db.yfvxwwayhlupnxhonhzi.supabase.co`
- ✅ `DB_PORT=6543`
- ✅ `DB_USERNAME=postgres.yfvxwwayhlupnxhonhzi`
- ✅ `DB_PASSWORD=your_password`
- ✅ `DB_DATABASE=postgres`
- ✅ `DB_SSL=true`
- ✅ `SUPABASE_URL=https://yfvxwwayhlupnxhonhzi.supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY=your_key`
- ✅ `JWT_SECRET=your_secret`
- ✅ `JWT_REFRESH_SECRET=your_refresh_secret`
- ✅ `JWT_EXPIRATION=3600`
- ✅ `JWT_REFRESH_EXPIRATION=604800`
- ✅ `FRONTEND_URL=your_frontend_url`

---

## Что изменилось в коде

### backend/src/database/database.module.ts

- ✅ Добавлено логирование конфигурации базы данных
- ✅ Добавлены оптимальные настройки connection pooling для serverless
- ✅ Добавлены таймауты для предотвращения зависаний

### backend/.env.example

- ✅ Добавлены все необходимые переменные для подключения к базе данных
- ✅ Добавлены комментарии с инструкциями где взять эти значения

---

## После успешного деплоя

1. Frontend автоматически начнет работать с backend
2. CORS ошибки исчезнут
3. Авторизация и все API endpoints заработают

Вопросы? Проверьте Runtime Logs в Vercel для диагностики.
