# Исправление 404 ошибки при взаимодействии с предложениями

## Проблема
При попытке принять/отклонить/отменить предложение возникала ошибка 404 "Offer not found".

## Причина
Таблица `offers` в базе данных **пустая** (0 записей). Предложения, которые отображались на frontend, были либо:
1. Старыми данными до применения миграции `20251124171025_fix_offers_table_postgrest_v2.sql` (которая выполняла `DROP TABLE`)
2. Кэшированными данными в браузере
3. Данными из demo режима

## Что было исправлено

### 1. Добавлено расширенное логирование
- В `OfferService` добавлено логирование загрузки офферов
- В `OfferCard` добавлено логирование обновления статусов
- В `OffersPage` добавлены префиксы для логов

### 2. Улучшена обработка ошибок
- При 404 ошибке теперь показывается специфичное сообщение: "Предложение не найдено. Пожалуйста, обновите страницу."
- Все ошибки логируются с контекстом

### 3. Backend работает корректно
- Backend корректно ищет офферы по `offer_id`
- RLS политики настроены правильно
- Структура таблицы соответствует ожиданиям

## Как создать тестовые данные

### Шаг 1: Получить ID пользователей
Выполните в Supabase SQL Editor:
```sql
SELECT user_id, email, user_type FROM user_profiles LIMIT 10;
```

### Шаг 2: Получить ID кампании (опционально)
```sql
SELECT campaign_id, title, advertiser_id FROM campaigns WHERE status = 'active' LIMIT 5;
```

### Шаг 3: Создать тестовые офферы
Замените `<INFLUENCER_ID>`, `<ADVERTISER_ID>` и `<CAMPAIGN_ID>` на реальные UUID:

```sql
-- Создание тестового оффера
INSERT INTO offers (
  offer_id,
  influencer_id,
  advertiser_id,
  campaign_id,
  initiated_by,
  status,
  details,
  timeline,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '<INFLUENCER_ID>'::uuid,  -- Замените на ID инфлюенсера
  '<ADVERTISER_ID>'::uuid,  -- Замените на ID рекламодателя
  '<CAMPAIGN_ID>'::uuid,    -- Замените на ID кампании
  '<ADVERTISER_ID>'::uuid,  -- Кто инициировал (обычно рекламодатель)
  'pending',
  jsonb_build_object(
    'title', 'Тестовое предложение о сотрудничестве',
    'description', 'Предлагаем сотрудничество по продвижению продукта',
    'proposedRate', 50000,
    'currency', 'RUB',
    'deliverables', jsonb_build_array('Пост в Instagram', 'Stories', 'Reels')
  ),
  jsonb_build_object(
    'deadline', (now() + interval '30 days')::text,
    'startDate', now()::text
  ),
  now(),
  now()
);
```

### Альтернативный вариант: Создать оффер без кампании
```sql
-- Если нет активных кампаний, можно создать оффер со старой кампанией или NULL
INSERT INTO offers (
  offer_id,
  influencer_id,
  advertiser_id,
  campaign_id,
  initiated_by,
  status,
  details,
  timeline,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '<INFLUENCER_ID>'::uuid,
  '<ADVERTISER_ID>'::uuid,
  NULL,  -- Можно оставить NULL если нет кампании
  '<ADVERTISER_ID>'::uuid,
  'pending',
  jsonb_build_object(
    'title', 'Прямое предложение',
    'description', 'Хотим предложить сотрудничество напрямую',
    'proposedRate', 75000,
    'currency', 'RUB',
    'deliverables', jsonb_build_array('Обзор продукта', 'Интеграция')
  ),
  jsonb_build_object(
    'deadline', (now() + interval '45 days')::text
  ),
  now(),
  now()
);
```

## Проверка
1. Откройте консоль браузера (F12)
2. Перейдите на страницу "Предложения"
3. В консоли должны появиться логи:
   - `[OfferService] Loading offers for participant: <user_id>`
   - `[OfferService] Loaded offers: [...]`
   - `[OffersPage] Loaded data: { applications: X, offers: Y }`

4. При клике на кнопку "Принять"/"Отклонить"/"Отменить" появятся:
   - `[OfferCard] Updating offer: { offerId: ..., newStatus: ... }`
   - `[OfferCard] Updated offer: {...}`

## Следующие шаги
1. Создайте тестовые данные используя SQL выше
2. Обновите страницу в браузере (Ctrl+F5 для очистки кэша)
3. Проверьте что офферы отображаются
4. Попробуйте принять/отклонить оффер
5. Проверьте логи в консоли браузера и Vercel

## Важно
- Убедитесь что `campaign_id` существует в таблице `campaigns` или установите его в `NULL`
- `initiated_by` должен быть либо `influencer_id` либо `advertiser_id`
- Все UUID должны существовать в соответствующих таблицах
