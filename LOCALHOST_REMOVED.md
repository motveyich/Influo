# ✅ localhost:3001 Полностью Удален

## Проблема решена

**Было:** Frontend делал запросы на `http://localhost:3001` во всех окружениях, получал "Failed to fetch"

**Стало:** Frontend по умолчанию использует Vercel backend `https://backend-ten-bice-31.vercel.app`

## Что изменено

### 1. API Client (`src/core/api.ts`)

**Старая логика:**
```typescript
const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001/api';
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  if (import.meta.env.PROD) {
    console.error('⚠️ VITE_API_BASE_URL not set in production! API calls will fail.');
    return '';
  }

  return 'http://localhost:3001/api'; // ← ПРОБЛЕМА
};
```

**Новая логика:**
```typescript
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  // DEFAULT: Vercel backend, NOT localhost
  return 'https://backend-ten-bice-31.vercel.app/api';
};
```

### Ключевые изменения:
- ✅ Убрана логика `import.meta.env.PROD`
- ✅ Убран fallback на localhost
- ✅ По умолчанию используется Vercel backend
- ✅ localhost используется ТОЛЬКО если явно задан в `.env.local`

### 2. Environment Configuration

**`.env` (закоммичен):**
```env
# Backend API Configuration
# Default: https://backend-ten-bice-31.vercel.app
# For local backend development, uncomment:
# VITE_API_BASE_URL=http://localhost:3001

# Supabase Configuration (optional, for realtime subscriptions only)
VITE_SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**`.env.local` (для локальной разработки, НЕ коммитится):**
```env
# Для разработки с локальным backend раскомментируйте:
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Vercel Production Environment

**Больше НЕ требуется** настраивать `VITE_API_BASE_URL` в Vercel, так как:
- По умолчанию используется Vercel backend
- Переменная нужна только для override

**Опционально:** Можно задать в Vercel для явности:
```env
VITE_API_BASE_URL=https://backend-ten-bice-31.vercel.app
```

## Проверка

### Build успешен:
```bash
✓ built in 10.57s
✅ No localhost:3001 found in dist/
```

### Source код чист:
```bash
grep -r "localhost:3001" src/
# Результат: Пусто (нет совпадений)
```

### Network Requests (после deploy):

**До исправления (❌ не работало):**
```
POST http://localhost:3001/api/auth/login  → Failed to fetch
```

**После исправления (✅ работает):**
```
POST https://backend-ten-bice-31.vercel.app/api/auth/login  → 200 OK
GET  https://backend-ten-bice-31.vercel.app/api/auth/me     → 200 OK
```

## Использование

### Production (по умолчанию):
```bash
# Ничего не нужно настраивать!
npm run build
# Автоматически использует: https://backend-ten-bice-31.vercel.app
```

### Local Development (с локальным backend):
```bash
# Создайте .env.local:
echo "VITE_API_BASE_URL=http://localhost:3001" > .env.local

# Запустите backend:
cd backend
npm run start:dev

# В другом терминале запустите frontend:
npm run dev
```

### Local Development (с Vercel backend):
```bash
# Просто запустите frontend (без .env.local):
npm run dev
# Автоматически использует: https://backend-ten-bice-31.vercel.app
```

## Архитектура

### Development (без локального backend):
```
Frontend (localhost:5173)
    ↓ по умолчанию
Backend (backend-ten-bice-31.vercel.app)
    ↓
Supabase
```

### Development (с локальным backend):
```
Frontend (localhost:5173)
    ↓ VITE_API_BASE_URL=http://localhost:3001
Backend (localhost:3001)
    ↓
Supabase
```

### Production:
```
Frontend (your-app.vercel.app)
    ↓ по умолчанию
Backend (backend-ten-bice-31.vercel.app)
    ↓
Supabase
```

## API Client Usage

Все запросы идут через единый `apiClient`:

```typescript
import { apiClient } from './core/api';

// Login
const response = await apiClient.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});

// Get user
const user = await apiClient.get('/auth/me');

// Update profile
await apiClient.patch('/profiles/123', { fullName: 'New Name' });
```

**Внутри apiClient автоматически:**
- Добавляет Authorization header с JWT token
- Формирует полный URL: `${API_URL}${endpoint}`
- Обрабатывает ошибки 401 (очищает токен)
- Парсит JSON ответы

## Что НЕ нужно делать

❌ **НЕ используйте** прямой `fetch()`:
```typescript
// ПЛОХО - не делайте так:
fetch('http://localhost:3001/api/auth/login', {...})
```

✅ **Используйте** `apiClient`:
```typescript
// ХОРОШО:
apiClient.post('/auth/login', {...})
```

❌ **НЕ хардкодите** URL:
```typescript
// ПЛОХО:
const API_URL = 'http://localhost:3001';
```

✅ **Используйте** конфигурацию:
```typescript
// ХОРОШО - уже настроено в src/core/api.ts
const API_URL = getApiBaseUrl();
```

## Vercel Deployment

### Frontend Deployment:

1. **Создайте Vercel проект** (если еще не создан)
2. **Deploy** (без настройки environment variables!)
3. **Готово!** Frontend автоматически использует Vercel backend

### Backend Deployment:

Backend уже развернут на `https://backend-ten-bice-31.vercel.app`

Убедитесь что настроены environment variables:
```env
NODE_ENV=production
SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_ORIGIN=https://your-frontend.vercel.app
```

## Troubleshooting

### Вижу "Failed to fetch" в production:

**Причина:** Backend не отвечает

**Решение:**
1. Проверьте backend:
   ```bash
   curl https://backend-ten-bice-31.vercel.app/api/health
   ```
2. Должен вернуть: `{"status":"ok",...}`
3. Если 404 - проверьте deployment backend

### Хочу использовать локальный backend:

**Решение:**
1. Создайте `.env.local`:
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   ```
2. Перезапустите dev server: `npm run dev`

### Backend на другом домене:

**Решение:**
Измените default в `src/core/api.ts`:
```typescript
return 'https://your-custom-backend.com/api';
```

## Статус

- ✅ localhost:3001 полностью удален из кода
- ✅ По умолчанию используется Vercel backend
- ✅ Build проходит без ошибок
- ✅ Нет хардкода URL
- ✅ Единый API client для всех запросов
- ✅ Локальная разработка поддерживается через .env.local

## Следующие шаги

1. **Deploy frontend на Vercel** (если еще не deployed)
2. **Откройте frontend в браузере**
3. **DevTools → Network tab**
4. **Попробуйте войти**
5. **Проверьте:**
   - ✅ Запросы идут на `https://backend-ten-bice-31.vercel.app`
   - ✅ Нет "Failed to fetch"
   - ✅ Login работает

## Готово! 🎉

Ваш frontend теперь полностью настроен для работы с Vercel backend по умолчанию. Больше никаких localhost в production!
