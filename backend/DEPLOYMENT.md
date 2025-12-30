# Deployment Guide - Influo Backend

## Phase 1 Complete ✅

Backend infrastructure с authentication модулем успешно создан и готов к деплою!

### Что уже сделано:

1. ✅ Базовая структура NestJS проекта
2. ✅ Конфигурация и Supabase интеграция
3. ✅ Authentication модуль с JWT
   - Регистрация пользователей
   - Вход/выход
   - Refresh токенов
   - Получение текущего пользователя
4. ✅ Guards, Interceptors, Filters
   - JwtAuthGuard - защита endpoints
   - RolesGuard - проверка ролей
   - TransformInterceptor - единый формат ответов
   - HttpExceptionFilter - обработка ошибок
5. ✅ Swagger документация
6. ✅ vercel.json конфигурация
7. ✅ Проект собран и готов к деплою

## Деплой на Vercel

### Шаг 1: Подготовка

1. Убедитесь что у вас установлен Vercel CLI:
```bash
npm install -g vercel
```

2. Войдите в Vercel:
```bash
vercel login
```

### Шаг 2: Настройка Environment Variables

Перед деплоем добавьте эти переменные окружения в Vercel Dashboard:

**Обязательные:**
- `SUPABASE_URL` - URL вашего Supabase проекта
- `SUPABASE_ANON_KEY` - публичный ключ
- `SUPABASE_SERVICE_ROLE_KEY` - приватный ключ для backend
- `JWT_SECRET` - секретный ключ для JWT (сгенерируйте сложный)
- `JWT_REFRESH_SECRET` - секретный ключ для refresh токенов
- `FRONTEND_URL` - URL вашего фронтенда (для CORS)

**Опциональные:**
- `JWT_EXPIRATION` (default: 3600 - 1 час)
- `JWT_REFRESH_EXPIRATION` (default: 604800 - 7 дней)
- `THROTTLE_TTL` (default: 60)
- `THROTTLE_LIMIT` (default: 10)
- `DEEPSEEK_API_KEY` - для AI функций
- `NODE_ENV` - установите в `production`

### Шаг 3: Deploy

Из директории `backend/`:

```bash
# Первый деплой (preview)
vercel

# Production deploy
vercel --prod
```

### Шаг 4: Получение Service Role Key

**ВАЖНО:** Вам нужен SUPABASE_SERVICE_ROLE_KEY для полной функциональности backend.

Как получить:
1. Откройте https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
2. Найдите раздел "Project API keys"
3. Скопируйте `service_role` ключ (НЕ `anon` ключ!)
4. Добавьте его в Vercel как `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **ВНИМАНИЕ:** Service role key имеет полный доступ к БД, храните его в секрете!

## После деплоя

### Проверка работоспособности:

1. **Health Check:**
```bash
curl https://your-backend.vercel.app/api
```

Ответ должен быть:
```json
{
  "success": true,
  "data": {
    "message": "Influo Platform API is running",
    "status": "healthy",
    "timestamp": "2024-01-..."
  }
}
```

2. **API Documentation:**
Откройте: `https://your-backend.vercel.app/api/docs`

### Тестирование Authentication:

1. **Signup:**
```bash
curl -X POST https://your-backend.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "fullName": "Test User",
    "userType": "influencer"
  }'
```

2. **Login:**
```bash
curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

3. **Get Current User:**
```bash
curl https://your-backend.vercel.app/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Интеграция с Frontend

Обновите frontend для использования нового backend API:

1. Обновите `.env` в frontend проекте:
```env
VITE_API_URL=https://your-backend.vercel.app/api
```

2. Создайте API client в frontend:
```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Автоматически добавлять JWT токен
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refreshToken }
          );

          localStorage.setItem('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

3. Используйте API client во всех сервисах:
```typescript
// Пример: src/services/authService.ts
import api from './api';

export const authService = {
  async signup(data: SignupData) {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', response.data.data.accessToken);
    localStorage.setItem('refreshToken', response.data.data.refreshToken);
    return response.data;
  },

  async logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  }
};
```

## Следующие шаги (Phase 2)

Теперь можно добавлять новые модули:

1. **ProfilesModule** - управление профилями
2. **InfluencerCardsModule** - карточки инфлюенсеров
3. **AdvertiserCardsModule** - карточки рекламодателей
4. **AutoCampaignsModule** - автоматические кампании
5. **ApplicationsModule** - заявки на сотрудничество
6. **OffersModule** - предложения о сотрудничестве
7. **ChatModule** - система чата
8. **PaymentsModule** - платёжная система
9. **ReviewsModule** - отзывы и рейтинги
10. **ModerationModule** - модерация контента
11. **AnalyticsModule** - аналитика
12. **NotificationsModule** - уведомления

## Мониторинг

После деплоя следите за:
- Логами в Vercel Dashboard
- Ошибками в Sentry (если настроен)
- Performance метриками
- Database usage в Supabase Dashboard

## Troubleshooting

### Ошибка: "User not found" при входе
- Проверьте что `SUPABASE_SERVICE_ROLE_KEY` установлен правильно
- Убедитесь что пользователь создан в таблице `user_profiles`

### Ошибка: CORS
- Проверьте что `FRONTEND_URL` установлен правильно
- Добавьте все нужные origins в `main.ts` -> `app.enableCors()`

### Ошибка: JWT verification failed
- Убедитесь что `JWT_SECRET` одинаковый на всех инстансах
- Проверьте что токен не истёк

## Полезные команды

```bash
# Просмотр логов
vercel logs

# Список деплоев
vercel ls

# Откатиться на предыдущую версию
vercel rollback

# Удалить проект
vercel remove
```

## Support

При возникновении проблем:
1. Проверьте логи в Vercel Dashboard
2. Проверьте Environment Variables
3. Проверьте Supabase connection
4. Проверьте API Documentation: `/api/docs`

---

**Backend готов к работе! 🚀**

Базовая инфраструктура с authentication модулем развёрнута и готова к добавлению бизнес-логики.
