# 🚀 Backend Deployment Instructions

## Проблема
Backend не задеплоен на Vercel. URL `backend-a92zq9x4c-matveys-projects-0d62e667.vercel.app` не существует.

## Решение (5-10 минут)

### Шаг 1: Deploy Backend на Vercel

#### Вариант A - Через Vercel Dashboard (Рекомендуется)

1. **Откройте Vercel Dashboard:**
   - Перейдите на https://vercel.com/new
   - Войдите в свой аккаунт

2. **Import Repository:**
   - Нажмите "Add New..." → "Project"
   - Выберите ваш Git репозиторий
   - Или загрузите папку `backend` напрямую

3. **Configure Project:**
   ```
   Project Name: influo-backend
   Framework Preset: Other
   Root Directory: backend/
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install --include=dev
   ```

4. **Environment Variables** (КРИТИЧЕСКИ ВАЖНО!)

   Добавьте эти переменные:
   ```
   JWT_SECRET=ваш_очень_длинный_секретный_ключ_минимум_32_символа
   JWT_REFRESH_SECRET=другой_очень_длинный_секретный_ключ_минимум_32_символа
   SUPABASE_URL=https://orbeqrnqroifdmwocyoz.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yYmVxcm5xcm9pZmRtd29jeW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAyMzAsImV4cCI6MjA4MTA0NjIzMH0.inIjVI6Jzb-NwnyvLN8Pxkd9A-Y4S9kku-cdlUUnoPE
   SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key_из_supabase
   FRONTEND_URL=https://bolt.new
   NODE_ENV=production
   PORT=3000
   ```

   **Как сгенерировать JWT секреты:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Deploy:**
   - Нажмите "Deploy"
   - Дождитесь окончания deployment (2-3 минуты)
   - Скопируйте Production URL (будет что-то вроде `influo-backend.vercel.app`)

#### Вариант B - Через Vercel CLI (Если установлен)

```bash
# 1. Установите Vercel CLI (если не установлен)
npm install -g vercel

# 2. Перейдите в папку backend
cd backend

# 3. Deploy
vercel --prod

# Следуйте инструкциям:
# - Framework: Other
# - Build Command: npm run build
# - Output Directory: dist
# - Install Command: npm install --include=dev
```

---

### Шаг 2: Обновите Frontend .env

После deployment скопируйте ваш новый backend URL и обновите файл `.env`:

```bash
VITE_API_BASE_URL=https://ваш-backend-url.vercel.app/api
```

**Пример:**
```bash
VITE_API_BASE_URL=https://influo-backend.vercel.app/api
```

---

### Шаг 3: Протестируйте Backend

После deployment проверьте что backend работает:

```bash
# Замените URL на ваш
curl https://ваш-backend-url.vercel.app/api/health
```

**Ожидаемый ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-16T...",
  "config": {
    "hasJwtSecret": true,
    "hasSupabaseUrl": true
  }
}
```

**Если `hasJwtSecret: false`** - вы забыли добавить JWT_SECRET в environment variables!

---

### Шаг 4: Протестируйте Login

```bash
# Тест регистрации
curl -X POST https://ваш-backend-url.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "role": "influencer"
  }'

# Тест логина
curl -X POST https://ваш-backend-url.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

**Ожидаемый ответ:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "...",
    "email": "test@example.com"
  }
}
```

---

## Что дальше?

После успешного deployment:

1. ✅ Скопируйте новый backend URL
2. ✅ Обновите `.env` файл frontend
3. ✅ Перезагрузите frontend
4. ✅ Попробуйте залогиниться в приложении

---

## Troubleshooting

### Проблема: "hasJwtSecret: false"
**Решение:** Добавьте `JWT_SECRET` и `JWT_REFRESH_SECRET` в Vercel Environment Variables и сделайте Redeploy.

### Проблема: CORS error
**Решение:** Убедитесь что `FRONTEND_URL=https://bolt.new` добавлен в Environment Variables.

### Проблема: "Cannot find module"
**Решение:** Убедитесь что:
- Build Command: `npm run build`
- Install Command: `npm install --include=dev`
- Output Directory: `dist`

### Проблема: Routes not found (404)
**Решение:** Проверьте что `vercel.json` правильно настроен:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" }
  ]
}
```

---

## Важные замечания

⚠️ **НИКОГДА не коммитьте JWT секреты в Git!**

⚠️ **Используйте разные секреты для production и development!**

✅ **Backend CORS уже настроен правильно** - проверяет `FRONTEND_URL` environment variable

✅ **api/index.js уже готов к работе с Vercel** - не нужно ничего менять

---

## После deployment

Я автоматически:
1. Обновлю `.env` с новым backend URL
2. Протестирую что login работает
3. Проверю что CORS настроен правильно

**Сообщите мне ваш новый backend URL после deployment!**
