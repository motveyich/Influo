# CORS и Database Connection - Инструкция по исправлению

## Проблема

Backend на Vercel не может подключиться к базе данных и выдает ошибки:
- ❌ `ECONNREFUSED 127.0.0.1:5432` - backend пытается подключиться к localhost
- ❌ CORS ошибки на frontend - backend не отвечает из-за ошибки БД

## Что было сделано

### 1. Обновлен `backend/.env.example`

Добавлены переменные для подключения к PostgreSQL через Supabase:
- `DB_HOST` - хост базы данных Supabase
- `DB_PORT` - порт connection pooler (6543)
- `DB_USERNAME` - имя пользователя PostgreSQL
- `DB_PASSWORD` - пароль базы данных
- `DB_DATABASE` - имя базы данных (postgres)
- `DB_SSL` - включение SSL (true)

### 2. Улучшен `backend/src/database/database.module.ts`

- ✅ Добавлено логирование конфигурации БД для отладки
- ✅ Добавлены оптимальные настройки connection pooling для Vercel
- ✅ Настроены таймауты подключений (10 сек)
- ✅ Ограничено количество соединений (max: 3) для serverless

### 3. Создан гайд `backend/VERCEL_DATABASE_FIX.md`

Подробная инструкция на русском языке с пошаговыми действиями.

---

## ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС

### Шаг 1: Получить данные подключения из Supabase

1. Откройте https://supabase.com/dashboard
2. Выберите проект `yfvxwwayhlupnxhonhzi`
3. Перейдите: **Project Settings** → **Database**
4. Найдите раздел **Connection Pooling**
5. Выберите режим **Transaction**
6. Скопируйте Connection String:

```
postgresql://postgres.yfvxwwayhlupnxhonhzi:[PASSWORD]@db.yfvxwwayhlupnxhonhzi.supabase.co:6543/postgres
```

Из этой строки возьмите:
- Host: `db.yfvxwwayhlupnxhonhzi.supabase.co`
- Port: `6543`
- Username: `postgres.yfvxwwayhlupnxhonhzi`
- Database: `postgres`
- Password: ваш пароль

### Шаг 2: Добавить переменные в Vercel

1. Откройте https://vercel.com/dashboard
2. Найдите проект `influo-seven` (backend)
3. Перейдите: **Settings** → **Environment Variables**
4. Добавьте эти переменные:

```
DB_HOST=db.yfvxwwayhlupnxhonhzi.supabase.co
DB_PORT=6543
DB_USERNAME=postgres.yfvxwwayhlupnxhonhzi
DB_PASSWORD=ваш_пароль_из_supabase
DB_DATABASE=postgres
DB_SSL=true
```

**Важно**: Установите для всех окружений (Production, Preview, Development)

### Шаг 3: Если не знаете пароль БД

1. В Supabase: **Project Settings** → **Database**
2. Найдите **Database Password**
3. Нажмите **Reset Database Password**
4. Скопируйте новый пароль (покажется только один раз!)
5. Используйте его в переменной `DB_PASSWORD`

### Шаг 4: Redeploy Backend

После добавления переменных:
1. В Vercel Dashboard → **Deployments**
2. Выберите последний деплоймент
3. Нажмите три точки → **Redeploy**

Или просто сделайте `git push`

### Шаг 5: Проверьте работу

В Runtime Logs вы должны увидеть:

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

Вместо ошибок `ECONNREFUSED 127.0.0.1:5432`

---

## Проверка API после фикса

```bash
# Тест авторизации
curl -X POST https://influo-seven.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

Если все работает - получите JWT токен вместо CORS ошибки.

---

## Чеклист всех переменных в Vercel

Убедитесь что есть ВСЕ эти переменные:

- ✅ `NODE_ENV=production`
- ✅ `DB_HOST=db.yfvxwwayhlupnxhonhzi.supabase.co`
- ✅ `DB_PORT=6543`
- ✅ `DB_USERNAME=postgres.yfvxwwayhlupnxhonhzi`
- ✅ `DB_PASSWORD=your_password`
- ✅ `DB_DATABASE=postgres`
- ✅ `DB_SSL=true`
- ✅ `SUPABASE_URL=https://yfvxwwayhlupnxhonhzi.supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY=your_service_key`
- ✅ `JWT_SECRET=your_jwt_secret`
- ✅ `JWT_REFRESH_SECRET=your_refresh_secret`
- ✅ `JWT_EXPIRATION=3600`
- ✅ `JWT_REFRESH_EXPIRATION=604800`
- ✅ `FRONTEND_URL=your_frontend_vercel_url`

---

## Почему это случилось?

Backend был настроен на использование TypeORM с PostgreSQL, но не были установлены переменные окружения для подключения к Supabase PostgreSQL в Vercel. Serverless функции не имеют доступа к localhost, поэтому попытка подключения к `127.0.0.1:5432` всегда будет падать.

## Что теперь?

После добавления переменных и redeploy:
1. ✅ Backend успешно подключится к Supabase PostgreSQL
2. ✅ CORS ошибки исчезнут
3. ✅ Все API endpoints заработают
4. ✅ Frontend сможет взаимодействовать с backend

---

Подробнее смотрите в `backend/VERCEL_DATABASE_FIX.md`
