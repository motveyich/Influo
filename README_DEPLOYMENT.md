# Deployment Documentation

## 📚 Документация развертывания

Ваше приложение теперь использует правильную архитектуру **Frontend → Backend → Supabase** и готово к деплою на Vercel.

## 🚀 Быстрый старт

**Нужно срочно исправить production?**
→ Читайте [`VERCEL_QUICK_FIX.md`](./VERCEL_QUICK_FIX.md)

**Первый раз деплоите?**
→ Читайте [`VERCEL_SETUP.md`](./VERCEL_SETUP.md)

## 📖 Доступная документация

### Deployment & Configuration

1. **[VERCEL_QUICK_FIX.md](./VERCEL_QUICK_FIX.md)** ⚡
   - Быстрое исправление за 3 шага
   - Настройка environment variables
   - Проверка конфигурации
   - **Читайте первым, если что-то сломалось**

2. **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** 📋
   - Полная инструкция по deployment на Vercel
   - Пошаговая настройка backend и frontend
   - Все environment variables с объяснениями
   - Troubleshooting для каждой проблемы

3. **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** ✅
   - Чеклист для проверки deployment
   - Тесты для каждого этапа
   - Verification script
   - Что делать если что-то не работает

### Architecture & Changes

4. **[FIXED_ARCHITECTURE.md](./FIXED_ARCHITECTURE.md)** 🏗️
   - Что было исправлено
   - До и после
   - Технические детали изменений
   - Как работает новая архитектура

5. **[ARCHITECTURE_CHANGES.md](./ARCHITECTURE_CHANGES.md)** 📐
   - Полное описание архитектуры
   - Все API endpoints
   - Security implementation
   - Migration guide

6. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** 📘
   - Детальный гайд по deployment
   - Local development setup
   - Production deployment
   - Testing procedures

### Development

7. **[QUICK_START.md](./QUICK_START.md)** 🏃
   - Быстрый старт для локальной разработки
   - Настройка environment variables
   - Troubleshooting для dev

8. **[API_EXAMPLE.md](./API_EXAMPLE.md)** 💻
   - Примеры API запросов
   - Authentication flow
   - Request/Response examples
   - Curl commands для тестирования

## 🔑 Ключевые изменения

### Environment Variables

**Было:**
```env
VITE_API_URL=http://localhost:3001/api
```

**Стало:**
```env
VITE_API_BASE_URL=http://localhost:3001
```

### API Configuration

**Было:** Хардкод localhost
```typescript
const API_URL = 'http://localhost:3001/api';
```

**Стало:** Динамическая конфигурация
```typescript
const API_URL = import.meta.env.VITE_API_BASE_URL + '/api';
```

### Production Setup

**Backend Vercel Environment Variables:**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=...
FRONTEND_ORIGIN=https://your-frontend.vercel.app
```

**Frontend Vercel Environment Variables:**
```env
VITE_API_BASE_URL=https://backend-ten-bice-31.vercel.app
```

## 📊 Архитектура

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│  Frontend       │  Vercel: your-app.vercel.app
│  (React + Vite) │  Env: VITE_API_BASE_URL
└────────┬────────┘
         │ HTTPS + JWT
         ↓
┌─────────────────┐
│  Backend API    │  Vercel: backend-ten-bice-31.vercel.app
│  (NestJS)       │  Env: SUPABASE_SERVICE_ROLE_KEY
└────────┬────────┘
         │ Service Role Key
         ↓
┌─────────────────┐
│  Supabase       │  Database, Auth, Storage
│  Database       │
└─────────────────┘
```

## 🎯 Что нужно сделать

### Для работы в production:

1. **Backend:** Уже развернут на `https://backend-ten-bice-31.vercel.app`
   - ✅ Код готов
   - ⚠️ Нужно настроить environment variables

2. **Frontend:** Нужно настроить и redeploy
   - ⚠️ Добавить `VITE_API_BASE_URL` в Vercel
   - ⚠️ Redeploy после изменений

3. **Проверить:**
   - Network tab не должен показывать localhost
   - Все запросы должны идти на backend.vercel.app
   - Login/Register должны работать

## ⚡ Быстрая настройка (5 минут)

```bash
# 1. Backend: Vercel Dashboard → backend project
# Settings → Environment Variables → Add:
# SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, FRONTEND_ORIGIN

# 2. Frontend: Vercel Dashboard → frontend project
# Settings → Environment Variables → Add:
VITE_API_BASE_URL=https://backend-ten-bice-31.vercel.app

# 3. Redeploy frontend
# Deployments → Redeploy

# 4. Проверка
curl https://backend-ten-bice-31.vercel.app/api/health
# Должен вернуть: {"status":"ok",...}
```

## 🆘 Помощь

### Если frontend не работает:
1. Проверьте `VITE_API_BASE_URL` в Vercel
2. Redeploy frontend
3. Hard refresh браузера
4. См. [`VERCEL_QUICK_FIX.md`](./VERCEL_QUICK_FIX.md)

### Если backend возвращает 404:
1. Проверьте Root Directory = `backend`
2. Проверьте `backend/api/index.ts` существует
3. Redeploy backend
4. См. [`VERCEL_SETUP.md`](./VERCEL_SETUP.md) → Troubleshooting

### Если CORS error:
1. Установите `FRONTEND_ORIGIN` в backend
2. Redeploy backend
3. См. [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md)

## ✅ Success Criteria

После настройки в Network tab должно быть:

```
✅ POST https://backend-ten-bice-31.vercel.app/api/auth/login
✅ GET  https://backend-ten-bice-31.vercel.app/api/auth/me
✅ GET  https://backend-ten-bice-31.vercel.app/api/profiles/xxx
❌ NO  http://localhost:3001/...
❌ NO  Failed to fetch
```

## 📝 Что дальше

После успешного deployment:

1. ✅ Протестируйте все функции
2. ✅ Проверьте Network tab
3. ✅ Настройте monitoring
4. ✅ Документируйте production URLs
5. ✅ Настройте CI/CD (опционально)

## 🔐 Безопасность

- ✅ Service role key ТОЛЬКО в backend
- ✅ Frontend НЕ имеет прямого доступа к Supabase
- ✅ Все запросы через backend API
- ✅ JWT authentication
- ✅ CORS правильно настроен

## 📞 Контакты

Если нужна помощь:
1. Проверьте соответствующий .md файл выше
2. Проверьте Vercel logs
3. Проверьте browser console
4. Проверьте Network tab

---

**Статус проекта:** ✅ Ready for Production Deployment

**Требуется:** Настроить environment variables в Vercel и redeploy

**Документация:** Полная и актуальная
