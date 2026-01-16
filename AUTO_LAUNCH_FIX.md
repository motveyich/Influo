# Исправление автоматического подбора инфлюенсеров

## Проблема
При создании автокампании подбор инфлюенсеров не запускался автоматически, потому что:
1. Кампания создавалась со статусом `draft`
2. Требовалось вручную нажать кнопку "Запустить"
3. Только тогда вызывался endpoint `/auto-campaigns/:id/launch`, который запускал подбор

## Решение
Теперь после создания кампании автоматически вызывается метод `/launch`, который:
1. Изменяет статус кампании на `active`
2. Ищет подходящих инфлюенсеров по критериям (платформа, размер аудитории)
3. Автоматически создает офферы для найденных инфлюенсеров

## Что изменено

### Frontend: `AutoCampaignModal.tsx`
```typescript
// Было:
await autoCampaignService.createCampaign(advertiserId, formData);
toast.success('Автокампания создана!');

// Стало:
const newCampaign = await autoCampaignService.createCampaign(advertiserId, formData);
toast.success('Автокампания создана!');

// Auto-launch the campaign
await autoCampaignService.launchCampaign(newCampaign.id, advertiserId);
toast.success('Автоматический подбор инфлюенсеров запущен!');
```

## Как это работает

### 1. Создание кампании
```
POST /api/auto-campaigns
{
  "title": "Моя кампания",
  "platforms": ["instagram"],
  "budgetMin": 100,
  "budgetMax": 500,
  "audienceMin": 1000,
  "audienceMax": 10000,
  "targetInfluencersCount": 10
}
→ Создается кампания со status='draft'
```

### 2. Автоматический запуск
```
POST /api/auto-campaigns/:id/launch
→ Backend:
  - Устанавливает status='active'
  - Ищет influencer_cards где:
    * platform соответствует campaigns.platforms
    * reach.followers между audienceMin и audienceMax
    * is_active = true
  - Создает offers для найденных инфлюенсеров
  - Обновляет sent_offers_count
```

### 3. Результат
- Пользователь видит кампанию со статусом "Активна"
- В списке офферов появляются автоматически созданные предложения
- Инфлюенсеры получают уведомления о новых предложениях

## Логирование

Backend логирует весь процесс:
```
Starting auto-offer distribution for campaign {id}
Campaign criteria: platforms=[...], audience=1000-10000, target=10
Found 50 active influencer cards
Matched 15 cards after platform and audience filtering
Available cards after excluding existing offers: 15
Will create 10 offers
Successfully created 10 offers for campaign {id}. Total sent: 10
```

## Проверка работы

После деплоя:
1. Создайте новую автокампанию
2. Проверьте логи backend (должны появиться сообщения о подборе)
3. Проверьте, что созданы офферы в таблице `offers`
4. Откройте страницу "Мои сотрудничества" в кампании

## Важно

Для работы подбора нужны:
1. Активные карточки инфлюенсеров (`influencer_cards.is_active = true`)
2. Заполненное поле `reach.followers`
3. Совпадение по платформе и размеру аудитории

Если подходящих карточек не найдено, в логах будет:
```
No matching cards found for campaign {id}. Check platforms and audience criteria.
```
