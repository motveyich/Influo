# 🚀 Быстрое руководство по deployment

## Проблема
CORS error при логине - **backend не задеплоен на Vercel**.

## Решение (5 минут)

### 1️⃣ Deploy Backend

**Перейдите:** https://vercel.com/new

**Настройки проекта:**
```
Root Directory: backend/
Build Command: npm run build
Output Directory: dist
Install Command: npm install --include=dev
```

**Environment Variables (КРИТИЧНО!):**
```bash
JWT_SECRET=ваш_секрет_минимум_32_символа
JWT_REFRESH_SECRET=другой_секрет_минимум_32_символа
SUPABASE_URL=https://orbeqrnqroifdmwocyoz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yYmVxcm5xcm9pZmRtd29jeW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAyMzAsImV4cCI6MjA4MTA0NjIzMH0.inIjVI6Jzb-NwnyvLN8Pxkd9A-Y4S9kku-cdlUUnoPE
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
FRONTEND_URL=https://bolt.new
NODE_ENV=production
```

**Сгенерировать JWT секреты:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2️⃣ Протестируйте Backend

После deployment запустите:
```bash
./test-backend.sh https://ваш-backend.vercel.app
```

Должны быть все ✅ зеленые галочки!

### 3️⃣ Обновите Frontend

Откройте `.env` и замените:
```bash
VITE_API_BASE_URL=https://ваш-backend.vercel.app/api
```

### 4️⃣ Готово!

Перезагрузите страницу и попробуйте залогиниться.

---

## Что я исправил

✅ Удалил конфликтующие CORS headers из `vercel.json`
✅ CORS теперь настраивается через NestJS (api/index.js)
✅ Backend готов принимать запросы от `https://bolt.new`
✅ Создал тестовый скрипт для проверки

## Сообщите мне

После deployment **сообщите ваш новый backend URL**, и я:
- Обновлю `.env` файл
- Протестирую login
- Проверю что все работает

---

**📝 Подробные инструкции:** `DEPLOY_BACKEND_INSTRUCTIONS.md`
