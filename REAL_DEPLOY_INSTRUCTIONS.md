# 🚨 BACKEND НЕ РАБОТАЕТ - ВОТ КАК ИСПРАВИТЬ

## Проблема

**Ваш скриншот показывает:**
```
Request URL: https://backend-ten-bice-31.vercel.app/api/auth/login
Status: 404 Not Found
X-Vercel-Error: NOT_FOUND
```

**Причина:** Vercel проект `backend-ten-bice-31` НЕ ОБНОВЛЯЛСЯ 2 дня. Последний деплой старый.

## Решение: Настроить Root Directory в Vercel

### Шаг 1: Зайти в настройки проекта

1. Открыть: https://vercel.com/dashboard
2. Найти проект: **backend-ten-bice-31**
3. Нажать **Settings**

### Шаг 2: Установить Root Directory

1. В боковой панели: **General**
2. Найти секцию: **Root Directory**
3. В поле ввести: `backend`
4. Нажать **Save**

![Root Directory](https://vercel.com/_next/image?url=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Ffront%2Fdocs%2Froot-directory.png&w=1920&q=75)

### Шаг 3: Переделать деплой

После установки Root Directory:

1. Вернуться в **Deployments**
2. Нажать **...** (три точки) на последнем деплое
3. Выбрать **Redeploy**
4. Подтвердить

ИЛИ просто сделать новый деплой:

```bash
cd backend
npx vercel --prod
```

## Альтернатива: Деплой через CLI (Быстрее)

### Вариант 1: С токеном

```bash
# 1. Получите токен: https://vercel.com/account/tokens
export VERCEL_TOKEN=ваш_токен_здесь

# 2. Перейдите в папку backend
cd backend

# 3. Задеплойте
npx vercel --prod --token=$VERCEL_TOKEN --yes

# Или в одну команду:
cd backend && npx vercel --prod --token=ваш_токен --yes
```

### Вариант 2: Через логин

```bash
cd backend

# Залогиниться
npx vercel login

# Задеплоить
npx vercel --prod

# Следуйте инструкциям:
# - Set up and deploy "~/backend"? [Y/n] → Y
# - Which scope? → выберите ваш аккаунт
# - Link to existing project? [y/N] → y
# - What's the name of your existing project? → backend-ten-bice-31
```

## После деплоя

Проверьте что работает:

```bash
# Health check
curl https://backend-ten-bice-31.vercel.app/api/health

# Должно вернуть:
# {"status":"ok","message":"API is healthy"}

# Login endpoint
curl -X OPTIONS https://backend-ten-bice-31.vercel.app/api/auth/login

# Должно вернуть CORS headers (не 404!)
```

## Что должно измениться

### До (сейчас):
```
❌ Status: 404 Not Found
❌ X-Vercel-Error: NOT_FOUND
❌ Content-Type: text/plain
❌ Body: "The page could not be found"
```

### После (цель):
```
✅ Status: 200 OK (для OPTIONS)
✅ No X-Vercel-Error
✅ Access-Control-Allow-Origin: *
✅ Content-Type: application/json
```

## Environment Variables (ВАЖНО!)

Перед деплоем убедитесь что установлены в Vercel:

https://vercel.com/backend-ten-bice-31/settings/environment-variables

```env
SUPABASE_URL=https://skykdaqrbudwbvrrblgj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<получить_с_supabase>
SUPABASE_ANON_KEY=<получить_с_supabase>
JWT_SECRET=<сгенерировать>
JWT_REFRESH_SECRET=<сгенерировать>
FRONTEND_ORIGIN=*
NODE_ENV=production
```

### Получить Supabase ключи:

1. https://supabase.com/dashboard/project/skykdaqrbudwbvrrblgj/settings/api
2. Скопировать:
   - URL
   - anon public
   - service_role secret

### Сгенерировать JWT секреты:

```bash
# Запустить дважды для двух разных секретов
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Проверка что всё работает

После успешного деплоя:

### 1. Откройте DevTools
- F12 или ПКМ → Inspect
- Вкладка **Network**
- Очистить (Clear)

### 2. Попробуйте логин
- Введите любой email/password
- Нажмите "Вход"

### 3. Проверьте запросы

**OPTIONS запрос:**
```
Request URL: https://backend-ten-bice-31.vercel.app/api/auth/login
Method: OPTIONS
Status: 200 OK ✅
Response Headers:
  access-control-allow-origin: * ✅
  content-type: application/json ✅
```

**POST запрос:**
```
Request URL: https://backend-ten-bice-31.vercel.app/api/auth/login
Method: POST
Status: 401 Unauthorized (это OK если пароль неверный!) ✅
Response: {"statusCode":401,"message":"Invalid credentials"} ✅
```

**НЕ должно быть:**
```
❌ X-Vercel-Error: NOT_FOUND
❌ 404 Not Found
❌ "Failed to fetch"
```

## Если всё ещё не работает

### 1. Проверьте Build Logs

https://vercel.com/backend-ten-bice-31

Нажмите на последний деплой → **Build Logs**

Должно быть:
```
✓ Building...
✓ Installing dependencies
✓ Running build command: npm run build
✓ Build Completed
```

Не должно быть:
```
❌ Error: Cannot find module
❌ Build failed
❌ Command failed
```

### 2. Проверьте Function Logs

**Runtime Logs** → включите и посмотрите что выводится при запросе

Должно быть:
```
✅ NestJS initialized for Vercel
📥 POST /api/auth/login
```

### 3. Проверьте Root Directory

Settings → General → Root Directory = `backend`

Если пусто или указано что-то другое - установите `backend`

## Quick Commands

```bash
# Вся последовательность в одном блоке:

# 1. Перейти в backend
cd backend

# 2. Установить зависимости и собрать
npm install && npm run build

# 3. Задеплоить (с токеном)
npx vercel --prod --token=ваш_токен --yes

# 4. Проверить
curl https://backend-ten-bice-31.vercel.app/api/health
```

## Почему это произошло

Vercel НЕ обновляет деплой автоматически, если:
1. Нет подключения к Git репозиторию
2. Не было push в ветку
3. Root Directory был не настроен

**Решение:** Один раз правильно настроить Root Directory + сделать redeploy.

## Итог

**ДО деплоя:**
- ❌ 404 NOT_FOUND
- ❌ Backend не работает
- ❌ Frontend показывает "Failed to fetch"

**ПОСЛЕ деплоя:**
- ✅ 200/401 ответы
- ✅ JSON responses
- ✅ CORS работает
- ✅ Frontend может логиниться

---

## TL;DR - Самый быстрый способ

```bash
# Вариант 1: Через Dashboard (5 минут)
# 1. https://vercel.com/backend-ten-bice-31/settings
# 2. General → Root Directory → backend → Save
# 3. Deployments → ... → Redeploy

# Вариант 2: Через CLI (2 минуты)
cd backend
npx vercel --prod --token=ваш_токен_с_vercel.com/account/tokens --yes

# Проверить:
curl https://backend-ten-bice-31.vercel.app/api/health
# Должно вернуть: {"status":"ok"}
```

**Сделайте ОДНО из двух - и всё заработает!** 🚀
