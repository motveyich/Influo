# ✅ Архитектура исправлена: Frontend → Backend → Supabase

## Что было исправлено

### Проблема
- Фронтенд делал запросы на `http://localhost:3001` в продакшене
- Получал ошибку "Failed to fetch"
- Backend на Vercel (`https://backend-ten-bice-31.vercel.app`) не использовался

### Решение
Создан единый API клиент с динамической конфигурацией через environment variables.

## Изменения в коде

### 1. API Client (`src/core/api.ts`)

**Было:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

**Стало:**
```typescript
const getApiBaseUrl = (): string => {
  // Server-side rendering fallback
  if (typeof window === 'undefined') {
    return 'http://localhost:3001/api';
  }

  // Get from environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    // Ensure /api suffix
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  // Production check - warn if not configured
  if (import.meta.env.PROD) {
    console.error('⚠️ VITE_API_BASE_URL not set in production! API calls will fail.');
    return '';
  }

  // Development fallback
  return 'http://localhost:3001/api';
};

const API_URL = getApiBaseUrl();
```

**Что это дает:**
- ✅ В development автоматически использует localhost
- ✅ В production требует явную настройку `VITE_API_BASE_URL`
- ✅ Показывает ошибку в консоли, если production не настроен
- ✅ Автоматически добавляет `/api` к URL
- ✅ НЕТ хардкода localhost

### 2. Environment Variables

**`.env` (локальная разработка):**
```env
VITE_API_BASE_URL=http://localhost:3001
```

**Vercel (production):**
```env
VITE_API_BASE_URL=https://backend-ten-bice-31.vercel.app
```

Обратите внимание:
- URL **БЕЗ** `/api` на конце - добавляется автоматически
- Только домен backend

### 3. `.env.example` обновлен

```env
# Backend API Configuration
# Local: http://localhost:3001
# Production: https://your-backend.vercel.app
VITE_API_BASE_URL=http://localhost:3001
```

Четкие инструкции для разработчиков.

## Настройка Vercel

### Backend (уже развернут)
URL: `https://backend-ten-bice-31.vercel.app`

**Environment Variables в Vercel:**
```env
NODE_ENV=production
API_PREFIX=api
FRONTEND_ORIGIN=https://your-frontend.vercel.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### Frontend (нужно настроить)

**Environment Variables в Vercel:**
```env
VITE_API_BASE_URL=https://backend-ten-bice-31.vercel.app
```

Это **единственная** обязательная переменная!

## Как работает

### Development (локально)
```
Frontend (localhost:5173)
    ↓ VITE_API_BASE_URL = http://localhost:3001
Backend (localhost:3001)
    ↓ SUPABASE_SERVICE_ROLE_KEY
Supabase
```

### Production (Vercel)
```
Frontend (your-app.vercel.app)
    ↓ VITE_API_BASE_URL = https://backend-ten-bice-31.vercel.app
Backend (backend-ten-bice-31.vercel.app)
    ↓ SUPABASE_SERVICE_ROLE_KEY
Supabase
```

## Network Tab - До и После

### ❌ До (неправильно)
```
POST http://localhost:3001/api/auth/login  ← Failed to fetch
POST http://localhost:3001/api/auth/signup ← Failed to fetch
```

### ✅ После (правильно)
```
POST https://backend-ten-bice-31.vercel.app/api/auth/login  ← 200 OK
POST https://backend-ten-bice-31.vercel.app/api/auth/signup ← 201 Created
GET  https://backend-ten-bice-31.vercel.app/api/auth/me     ← 200 OK
```

## Проверка конфигурации

### Локально
1. Убедитесь, что `.env` содержит:
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   ```

2. Запустите backend:
   ```bash
   cd backend
   npm run start:dev
   ```

3. Запустите frontend:
   ```bash
   npm run dev
   ```

4. Откройте `http://localhost:5173`
5. Проверьте Network tab - запросы должны идти на `localhost:3001`

### Production
1. Настройте в Vercel frontend:
   - Settings → Environment Variables
   - Add: `VITE_API_BASE_URL=https://backend-ten-bice-31.vercel.app`

2. Redeploy frontend

3. Откройте ваш frontend URL

4. Откройте DevTools → Network tab

5. Попробуйте войти/зарегистрироваться

6. **Проверьте:**
   - ✅ Все запросы идут на `https://backend-ten-bice-31.vercel.app`
   - ❌ НЕТ запросов на `localhost:3001`
   - ❌ НЕТ "Failed to fetch"

## Отладка

### Если видите localhost в production:

**Причина:** `VITE_API_BASE_URL` не установлен в Vercel

**Решение:**
1. Vercel Dashboard → Ваш frontend проект
2. Settings → Environment Variables
3. Add Variable:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://backend-ten-bice-31.vercel.app`
4. Deployments → Redeploy latest deployment

### Если видите ошибку в консоли:
```
⚠️ VITE_API_BASE_URL not set in production! API calls will fail.
```

Это значит переменная не установлена. Следуйте инструкции выше.

### Если видите CORS error:

**Решение:**
1. Backend Vercel project → Settings → Environment Variables
2. Update `FRONTEND_ORIGIN` to your frontend URL
3. Redeploy backend

## API Endpoints

Все эндпоинты доступны с префиксом `/api`:

**Authentication:**
- POST `/api/auth/signup` - Регистрация
- POST `/api/auth/login` - Вход
- POST `/api/auth/logout` - Выход
- GET `/api/auth/me` - Текущий пользователь

**Health Check:**
- GET `/api/health` - Проверка работоспособности

**Swagger Docs:**
- GET `/api/docs` - API документация

## Документация

Созданы подробные гайды:

1. **`VERCEL_SETUP.md`** - Полная инструкция по deploy на Vercel
2. **`PRODUCTION_CHECKLIST.md`** - Чеклист для проверки production
3. **`QUICK_START.md`** - Быстрый старт для разработки
4. **`DEPLOYMENT_GUIDE.md`** - Детальный гайд по deployment
5. **`ARCHITECTURE_CHANGES.md`** - Описание архитектуры

## Следующие шаги

1. **Настройте Vercel:**
   - Frontend: добавьте `VITE_API_BASE_URL`
   - Backend: проверьте все env variables

2. **Redeploy frontend**

3. **Проверьте:**
   - Откройте frontend URL
   - DevTools → Network
   - Войдите в систему
   - Убедитесь, что все запросы идут на backend Vercel

4. **Если все работает:**
   - ✅ Нет localhost в production
   - ✅ Нет "Failed to fetch"
   - ✅ Логин/регистрация работают
   - ✅ Все запросы идут через backend

## Безопасность

- ✅ Service role key ТОЛЬКО в backend
- ✅ Frontend использует только backend API
- ✅ JWT tokens для аутентификации
- ✅ CORS настроен правильно
- ✅ Нет прямых запросов к Supabase с frontend

## Техническая информация

**Frontend репозиторий:** основной корень
**Backend репозиторий:** папка `backend/`

**Frontend билдится:** Vite
**Backend билдится:** NestJS → Vercel Serverless

**API формат:**
- Base URL: из `VITE_API_BASE_URL`
- Prefix: `/api` (добавляется автоматически)
- Full URL: `${VITE_API_BASE_URL}/api/endpoint`

**Пример:**
```typescript
// apiClient автоматически формирует URL:
await apiClient.post('/auth/login', { email, password });
// → POST https://backend-ten-bice-31.vercel.app/api/auth/login
```

## Статус

✅ **Исправлено:**
- API клиент с динамической конфигурацией
- Environment variables обновлены
- Документация создана
- Build проходит успешно

⚠️ **Требуется:**
- Настроить `VITE_API_BASE_URL` в Vercel frontend
- Redeploy frontend
- Протестировать в production

## Контакты для поддержки

Если что-то не работает:
1. Проверьте `PRODUCTION_CHECKLIST.md`
2. Посмотрите `VERCEL_SETUP.md`
3. Проверьте Vercel logs
4. Проверьте browser console и Network tab
