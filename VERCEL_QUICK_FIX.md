# 🚀 Быстрое исправление Vercel

## Проблема
Frontend в production обращается к `http://localhost:3001` вместо backend на Vercel.

## Решение за 3 шага

### Шаг 1: Настройте Backend Environment Variables

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в backend проект: `backend-ten-bice-31`
3. Settings → Environment Variables
4. Убедитесь, что установлены:

```env
SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
JWT_SECRET=YOUR_32_CHAR_SECRET
JWT_REFRESH_SECRET=YOUR_32_CHAR_SECRET
FRONTEND_ORIGIN=https://your-frontend.vercel.app
API_PREFIX=api
NODE_ENV=production
```

**Где взять `SUPABASE_SERVICE_ROLE_KEY`:**
1. Supabase Dashboard → Project Settings → API
2. Скопируйте `service_role` key (⚠️ НЕ anon key!)

**Как сгенерировать JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Шаг 2: Настройте Frontend Environment Variables

1. Vercel Dashboard → Ваш frontend проект
2. Settings → Environment Variables
3. Добавьте ОДНУ переменную:

```env
VITE_API_BASE_URL=https://backend-ten-bice-31.vercel.app
```

⚠️ **ВАЖНО:**
- URL БЕЗ `/api` на конце
- Только домен backend

### Шаг 3: Redeploy Frontend

1. Deployments → Latest deployment → ⋯ → Redeploy
2. Дождитесь завершения deployment

## Проверка

1. Откройте ваш frontend: `https://your-app.vercel.app`
2. Откройте DevTools → Network tab
3. Попробуйте войти/зарегистрироваться
4. **Проверьте запросы:**

### ✅ Правильно:
```
POST https://backend-ten-bice-31.vercel.app/api/auth/login  (200 OK)
GET  https://backend-ten-bice-31.vercel.app/api/auth/me     (200 OK)
```

### ❌ Неправильно:
```
POST http://localhost:3001/api/auth/login  (Failed to fetch)
```

## Если не работает

### Вариант 1: Переменная не применилась
- Redeploy frontend еще раз
- Hard refresh браузера (Ctrl+F5)
- Очистите кэш браузера

### Вариант 2: Backend не отвечает
Проверьте backend:
```bash
curl https://backend-ten-bice-31.vercel.app/api/health
```

Должен вернуть:
```json
{"status":"ok","message":"API is healthy",...}
```

Если 404 или ошибка:
1. Vercel → backend project → Settings
2. Проверьте Root Directory = `backend`
3. Redeploy backend

### Вариант 3: CORS error
1. Backend → Settings → Environment Variables
2. Update `FRONTEND_ORIGIN` to точный URL frontend
3. Redeploy backend

## Итоговая конфигурация

**Backend URL:** `https://backend-ten-bice-31.vercel.app`
**Frontend URL:** `https://your-app.vercel.app`

**Backend Env Vars:**
- ✅ All Supabase credentials
- ✅ JWT secrets
- ✅ `FRONTEND_ORIGIN` = frontend URL
- ✅ `API_PREFIX=api`

**Frontend Env Vars:**
- ✅ `VITE_API_BASE_URL` = backend URL

## Все работает?

- [ ] Frontend загружается
- [ ] Нет ошибок в консоли
- [ ] Login/Register работают
- [ ] В Network tab все запросы идут на backend.vercel.app
- [ ] Нет запросов на localhost

Если все чекбоксы отмечены - всё настроено правильно! 🎉

## Полная документация

Для детальной информации смотрите:
- `VERCEL_SETUP.md` - Полный гайд по deployment
- `PRODUCTION_CHECKLIST.md` - Чеклист проверки
- `FIXED_ARCHITECTURE.md` - Что было исправлено
