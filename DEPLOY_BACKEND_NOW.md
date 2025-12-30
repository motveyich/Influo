# 🚀 Deploy Backend - Простая Инструкция

## Шаг 1: Скопируйте и запустите эту команду

```bash
cd backend && ./deploy.sh
```

**ИЛИ без скрипта:**

```bash
cd backend
npm run build
npx vercel --prod
```

## Шаг 2: Отвечайте на вопросы

Vercel задаст несколько вопросов. Отвечайте так:

```
? Set up and deploy "~/backend"? [Y/n]
→ Y (нажмите Enter)

? Which scope do you want to deploy to?
→ Выберите ваш аккаунт (стрелками ↑↓ и Enter)

? Link to existing project? [y/N]
→ N (нажмите Enter - создать новый проект)

? What's your project's name?
→ backend (или любое имя, нажмите Enter)

? In which directory is your code located?
→ ./ (нажмите Enter)
```

После этого начнется деплой. Подождите ~30-60 секунд.

## Шаг 3: Скопируйте URL

После успешного деплоя вы увидите:

```
✅ Production: https://backend-abc123xyz.vercel.app [copied to clipboard]
```

**Скопируйте этот URL!**

## Шаг 4: Добавьте Environment Variables

1. Откройте: https://vercel.com/dashboard
2. Найдите свой новый проект `backend`
3. Откройте: **Settings** → **Environment Variables**
4. Добавьте каждую переменную:

### Обязательные переменные:

**SUPABASE_URL**
```
https://skykdaqrbudwbvrrblgj.supabase.co
```

**SUPABASE_ANON_KEY**
```
Получить здесь: https://supabase.com/dashboard/project/skykdaqrbudwbvrrblgj/settings/api
Скопируйте "anon public" ключ
```

**SUPABASE_SERVICE_ROLE_KEY**
```
Получить здесь: https://supabase.com/dashboard/project/skykdaqrbudwbvrrblgj/settings/api
Скопируйте "service_role secret" ключ (нажмите "Reveal")
```

**JWT_SECRET**
```bash
# Сгенерируйте командой:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Скопируйте результат
```

**JWT_REFRESH_SECRET**
```bash
# Сгенерируйте командой (еще раз):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Скопируйте результат (должен быть другой!)
```

**FRONTEND_ORIGIN**
```
*
```

**NODE_ENV**
```
production
```

### Как добавить переменную:

1. Нажмите **Add New**
2. Key: `SUPABASE_URL`
3. Value: `https://skykdaqrbudwbvrrblgj.supabase.co`
4. Environment: выберите **Production**, **Preview**, и **Development**
5. Нажмите **Save**
6. Повторите для всех остальных переменных

## Шаг 5: Redeploy

После добавления всех переменных:

1. Вернитесь в **Deployments**
2. Найдите последний деплой
3. Нажмите **...** (три точки)
4. Выберите **Redeploy**
5. Подтвердите

## Шаг 6: Проверьте что работает

```bash
# Замените URL на ваш:
curl https://ваш-backend-url.vercel.app/api/health
```

**Должно вернуть:**
```json
{"status":"ok","message":"API is healthy"}
```

**Если вернет ошибку** - проверьте Function Logs в Vercel Dashboard.

## Шаг 7: Обновите Frontend

Откройте `.env` файл в КОРНЕ проекта:

```env
VITE_BACKEND_URL=https://ваш-backend-url.vercel.app
```

Замените на ваш реальный URL из Шага 3.

## Готово!

Теперь:
1. ✅ Backend задеплоен на Vercel
2. ✅ Environment variables установлены
3. ✅ Frontend знает куда обращаться
4. ✅ Можно тестировать логин

---

## Если что-то не работает

### Проблема: "Failed to fetch"

**Решение:** Проверьте:
1. CORS настроен? (должен быть `FRONTEND_ORIGIN=*`)
2. Environment variables добавлены?
3. После добавления env vars сделали redeploy?

### Проблема: Build Failed

**Решение:**
```bash
cd backend
npm install
npm run build
```

Если команда выше работает локально - значит проблема в Vercel settings.

### Проблема: 500 Internal Server Error

**Решение:**
1. Откройте Vercel Dashboard → ваш проект
2. **Deployments** → последний деплой → **Functions**
3. Нажмите на `/api` → **Logs**
4. Посмотрите что там пишется

Скорее всего не хватает какой-то environment variable.

---

## TL;DR - Одной командой

```bash
# 1. Деплой
cd backend && npx vercel --prod

# 2. Добавить env vars в Dashboard
# https://vercel.com/dashboard → Settings → Environment Variables

# 3. Redeploy
# Dashboard → Deployments → ... → Redeploy

# 4. Проверить
curl https://ваш-url.vercel.app/api/health

# 5. Обновить .env в корне проекта
echo "VITE_BACKEND_URL=https://ваш-url.vercel.app" >> .env
```

**Все! После этого логин заработает.** 🎉
