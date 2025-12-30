# Quick Start - Новый Data Layer

## 1. Backend запуск

```bash
cd backend
npm install  # если еще не установлено
npm run start:dev
```

Backend запустится на `http://localhost:3001`

## 2. Frontend запуск

```bash
npm install  # если еще не установлено
npm run dev
```

Frontend запустится на `http://localhost:5173`

## 3. Проверка подключения

**Health Check:**
```bash
curl http://localhost:3001/api/health
```

Ответ должен быть:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected"
  }
}
```

## Архитектура

```
Frontend (localhost:5173)
    ↓ /api/* (proxy)
Backend (localhost:3001)
    ↓ Service Role Key
Supabase (PostgreSQL)
```

## Важно

- ✅ Frontend НЕ имеет прямого доступа к Supabase
- ✅ Все данные идут через backend API
- ✅ Service Role Key хранится ТОЛЬКО в backend/.env
- ✅ Стандартный формат ответа: `{success, data, timestamp}`

## Endpoints

```
GET  /api/health          - Health check
POST /api/auth/signup     - Регистрация
POST /api/auth/login      - Вход
GET  /api/profiles        - Профили (требует JWT)
...
```

## Документация API

Доступна по адресу: `http://localhost:3001/api/docs`
