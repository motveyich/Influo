# 🚀 Deploy Frontend СЕЙЧАС (2 минуты)

## ✅ Готово к deploy

**localhost полностью удален!** Frontend теперь по умолчанию использует Vercel backend.

## Быстрый Deploy

### Шаг 1: Deploy на Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import ваш Git репозиторий
4. **Root Directory:** `.` (корень проекта)
5. Click "Deploy"

### Шаг 2: Готово!

Больше ничего не нужно настраивать! 🎉

**Environment variables НЕ ТРЕБУЮТСЯ**, так как:
- Frontend по умолчанию использует `https://backend-ten-bice-31.vercel.app`
- Хардкод localhost полностью удален

## Проверка после Deploy

1. Откройте ваш frontend URL: `https://your-app.vercel.app`
2. Откройте DevTools → Network tab
3. Попробуйте войти/зарегистрироваться

**Должны видеть:**
```
✅ POST https://backend-ten-bice-31.vercel.app/api/auth/login  (200 OK)
✅ GET  https://backend-ten-bice-31.vercel.app/api/auth/me     (200 OK)
❌ НЕТ http://localhost:3001/...
❌ НЕТ Failed to fetch
```

## Если что-то не работает

### Backend не отвечает:

Проверьте backend:
```bash
curl https://backend-ten-bice-31.vercel.app/api/health
```

Должен вернуть:
```json
{"status":"ok","message":"API is healthy",...}
```

**Если 404 или ошибка:**
1. Откройте [Backend Vercel Project](https://vercel.com/dashboard)
2. Проверьте deployment logs
3. Убедитесь что Root Directory = `backend`

### CORS Error:

**Решение:**
1. Backend Vercel → Settings → Environment Variables
2. Добавьте/обновите:
   ```
   FRONTEND_ORIGIN=https://your-frontend.vercel.app
   ```
3. Redeploy backend

### 401 Unauthorized:

**Решение:**
Backend environment variables не настроены.

Проверьте что в backend есть:
```env
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
SUPABASE_SERVICE_ROLE_KEY=your_key
```

## Backend Environment Variables

Если backend еще не настроен, добавьте в Vercel:

```env
NODE_ENV=production
API_PREFIX=api

SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

JWT_SECRET=your_very_strong_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_very_strong_refresh_secret_minimum_32_characters
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

FRONTEND_ORIGIN=https://your-frontend.vercel.app

THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

**Как получить SUPABASE_SERVICE_ROLE_KEY:**
1. Supabase Dashboard → Project Settings → API
2. Копируйте `service_role` key (⚠️ НЕ anon key!)

**Как сгенерировать JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Local Development

### С Vercel Backend (рекомендуется):
```bash
npm run dev
# Автоматически использует Vercel backend
```

### С Local Backend:
```bash
# Создайте .env.local
echo "VITE_API_BASE_URL=http://localhost:3001" > .env.local

# Запустите backend
cd backend
npm run start:dev

# В другом терминале запустите frontend
npm run dev
```

## Полная документация

- **[LOCALHOST_REMOVED.md](./LOCALHOST_REMOVED.md)** - Что было изменено
- **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** - Полный гайд по deployment
- **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** - Чеклист проверки

## Готово! 🎉

Просто deploy на Vercel и всё работает!

**Backend:** `https://backend-ten-bice-31.vercel.app`
**Frontend:** `https://your-app.vercel.app` (после deploy)

Никаких environment variables для frontend не требуется!
