# Быстрый деплой backend на Vercel

## Проблема
После обновления констант платформ на lowercase ('instagram', 'youtube'), backend на Vercel все еще работает со старым кодом и отклоняет валидные запросы с ошибкой 400.

## Решение

### Вариант 1: Деплой через Vercel CLI (Рекомендуется)

```bash
cd backend

# Установить Vercel CLI (если еще не установлен)
npm i -g vercel

# Залогиниться в Vercel
vercel login

# Задеплоить (выберите существующий проект influo-backend)
vercel --prod
```

### Вариант 2: Деплой через Git + Vercel Dashboard

1. Закоммитить изменения:
```bash
cd /tmp/cc-agent/62025845/project
git add backend/
git commit -m "fix: update platform constants to lowercase"
git push
```

2. Vercel автоматически задеплоит изменения (если настроена интеграция с Git)

### Вариант 3: Ручной деплой через Vercel Dashboard

1. Открыть [Vercel Dashboard](https://vercel.com/dashboard)
2. Найти проект backend (например, `influo-backend`)
3. Нажать "Redeploy" для последнего деплоя
4. Или загрузить проект вручную через "Import Project"

## Что было исправлено

### Backend изменения:
- ✅ `backend/src/common/constants/platforms.ts` - Platform enum с lowercase значениями
- ✅ `backend/src/common/constants/content-types.ts` - ContentType enum
- ✅ `backend/src/common/constants/index.ts` - Централизованный экспорт
- ✅ `backend/src/modules/auto-campaigns/dto/create-auto-campaign.dto.ts` - Использует новые константы
- ✅ `backend/src/modules/influencer-cards/dto/create-influencer-card.dto.ts` - Использует новые константы
- ✅ `backend/src/modules/advertiser-cards/dto/create-advertiser-card.dto.ts` - Использует новые константы

### Теперь backend принимает:
```json
{
  "platforms": ["instagram", "tiktok", "youtube"],  // lowercase!
  "contentTypes": ["post", "story", "reel"]
}
```

## Проверка после деплоя

```bash
# Проверить что API работает
curl https://YOUR-BACKEND-URL.vercel.app/api/auto-campaigns

# Проверить создание кампании (замените TOKEN и URL)
curl -X POST https://YOUR-BACKEND-URL.vercel.app/api/auto-campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Campaign",
    "platforms": ["instagram"],
    "contentTypes": ["post"],
    "budgetMin": 1000,
    "budgetMax": 5000,
    "audienceMin": 10000,
    "audienceMax": 50000,
    "targetInfluencersCount": 5
  }'
```

## Troubleshooting

### Если все еще получаете 400 ошибку:

1. **Очистить кеш Vercel:**
   - Vercel Dashboard → Settings → Clear Cache
   - Redeploy

2. **Проверить переменные окружения:**
   - Убедитесь что все ENV переменные настроены в Vercel Dashboard
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_SECRET`

3. **Проверить логи:**
   - Vercel Dashboard → Deployments → [Latest] → Function Logs
   - Искать ошибки валидации

4. **Локальная проверка:**
```bash
cd backend
npm run build  # Должно пройти без ошибок
```

## Текущий статус

✅ Backend код обновлен и готов к деплою
✅ Frontend код обновлен
✅ Build проходит успешно
⏳ Ожидает деплоя на Vercel production

После деплоя создание автокампаний будет работать корректно!
