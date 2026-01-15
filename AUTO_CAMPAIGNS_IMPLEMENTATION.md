# Реализация откликов на автокампании и автоматической отправки предложений

## Краткое описание

Реализована полная функциональность для откликов инфлюенсеров на автокампании и автоматической отправки предложений подходящим инфлюенсерам при запуске кампании.

## Что было реализовано

### 1. Frontend - Добавлен метод createAutoCampaignOffer

**Файл:** `src/modules/offers/services/offerService.ts`

- Добавлен новый метод `createAutoCampaignOffer` для создания откликов на автокампании
- Метод принимает все необходимые данные: autoCampaignId, influencerId, advertiserId, title, description, proposedRate, currency, deliverables, timeline
- Отправляет POST запрос на `/offers` с правильной структурой данных
- Включает аналитику для отслеживания создания офферов

### 2. Backend DTO - Обновлен CreateOfferDto

**Файл:** `backend/src/modules/offers/dto/create-offer.dto.ts`

- Добавлено поле `autoCampaignId` (опциональное, UUID)
- Добавлено поле `deliverables` (массив строк)
- Добавлено поле `timeline` (строка)
- Все новые поля с валидацией и Swagger документацией

### 3. Backend OffersService - Поддержка автокампаний

**Файл:** `backend/src/modules/offers/offers.service.ts`

Метод `create` теперь:
- Проверяет существование автокампании (если указан autoCampaignId)
- Валидирует статус кампании (не closed/completed)
- Сохраняет auto_campaign_id в базу данных
- Сохраняет deliverables и timeline
- Автоматически инкрементирует счетчик sent_offers_count в таблице auto_campaigns

### 4. Backend AutoCampaignsService - Автоматическая отправка

**Файл:** `backend/src/modules/auto-campaigns/auto-campaigns.service.ts`

#### Обновлен метод launchCampaign:
- При запуске кампании вызывается `sendOffersToMatchingInfluencers`
- Автоматически создаются предложения для подходящих инфлюенсеров

#### Добавлен метод sendOffersToMatchingInfluencers:
- Ищет все активные influencer_cards
- Фильтрует по критериям:
  - Платформа (должна совпадать с platforms кампании)
  - Размер аудитории (followers в диапазоне audience_min - audience_max)
- Исключает инфлюенсеров, которым уже отправлялись предложения
- Ограничивает количество по target_influencers_count
- Создает офферы со средним бюджетом
- Обновляет счетчик sent_offers_count

#### Добавлен метод getCampaignOffers:
- Возвращает все офферы для конкретной автокампании
- Доступен только владельцу кампании
- Включает информацию о рекламодателе и инфлюенсере

### 5. Backend AutoCampaignsController - Новый endpoint

**Файл:** `backend/src/modules/auto-campaigns/auto-campaigns.controller.ts`

Добавлен endpoint:
```
GET /auto-campaigns/:id/offers
```
- Требует аутентификации
- Возвращает список всех офферов для кампании
- Swagger документация

## Схема работы

### Для инфлюенсера (отклик на кампанию):

1. Инфлюенсер видит автокампанию во вкладке "Автоматические кампании"
2. Нажимает "Откликнуться"
3. Заполняет форму:
   - Предложенная ставка (в диапазоне бюджета)
   - Что предлагает (deliverables)
   - Сроки выполнения
   - Сообщение рекламодателю
4. Фронтенд вызывает `offerService.createAutoCampaignOffer()`
5. Бэкенд создает offer с:
   - `initiated_by` = influencer_id
   - `auto_campaign_id` = campaign_id
   - `status` = 'pending'
6. Счетчик sent_offers_count инкрементируется
7. Рекламодатель видит предложение во вкладке "Предложения"

### Для рекламодателя (запуск кампании):

1. Рекламодатель создает автокампанию
2. Заполняет критерии:
   - Бюджет (min/max)
   - Целевая аудитория (min/max followers)
   - Платформы
   - Типы контента
   - Количество инфлюенсеров
3. Нажимает "Запустить"
4. Бэкенд:
   - Меняет статус на 'active'
   - Ищет подходящих инфлюенсеров
   - Автоматически создает предложения
   - Обновляет счетчик sent_offers_count
5. Инфлюенсеры получают предложения во вкладке "Предложения"

## Структура данных в базе

### Таблица offers:
- `auto_campaign_id` (uuid, nullable) - ссылка на автокампанию
- `deliverables` (jsonb) - массив описаний работ
- `timeline` (text) - сроки выполнения
- `initiated_by` (uuid) - кто инициировал оффер

### Таблица auto_campaigns:
- `sent_offers_count` (integer) - счетчик отправленных предложений
- `accepted_offers_count` (integer) - счетчик принятых
- `completed_offers_count` (integer) - счетчик завершенных

## API Endpoints

### POST /api/offers
Создать новый оффер (для откликов инфлюенсеров)

**Body:**
```json
{
  "influencerId": "uuid",
  "advertiserId": "uuid",
  "autoCampaignId": "uuid",
  "title": "string",
  "description": "string",
  "amount": number,
  "currency": "string",
  "contentType": "string",
  "deliverables": ["string"],
  "timeline": "string"
}
```

### POST /api/auto-campaigns/:id/launch
Запустить автокампанию (автоматически создает предложения)

**Response:**
```json
{
  "message": "Campaign launched successfully",
  "status": "active"
}
```

### GET /api/auto-campaigns/:id/offers
Получить все офферы для кампании

**Response:**
```json
[
  {
    "id": "uuid",
    "advertiserId": "uuid",
    "influencerId": "uuid",
    "autoCampaignId": "uuid",
    "title": "string",
    "description": "string",
    "proposedRate": number,
    "status": "pending",
    ...
  }
]
```

## Валидация и безопасность

1. **Проверка существования кампании** - перед созданием оффера
2. **Проверка статуса кампании** - нельзя откликнуться на closed/completed
3. **Проверка диапазона бюджета** - ставка должна быть в пределах min/max
4. **Защита от дубликатов** - при автоотправке исключаются уже отправленные
5. **Ограничение количества** - не больше target_influencers_count
6. **Аутентификация** - все endpoints требуют JWT токен
7. **Авторизация** - только владелец видит офферы своей кампании

## Что дальше можно улучшить

1. Rate limiting - ограничить количество откликов в единицу времени
2. Уведомления - push/email при получении предложения
3. Фильтрация по интересам - добавить matching по audience_interests
4. Приоритизация - сортировать инфлюенсеров по relevance score
5. A/B тестирование - разные тексты предложений
6. Аналитика - conversion rate, время отклика, success rate

## Тестирование

Для тестирования:

1. Создайте автокампанию как рекламодатель
2. Запустите её - проверьте что предложения автоматически создаются
3. Войдите как инфлюенсер - проверьте что предложения видны
4. Откликнитесь на кампанию через форму
5. Проверьте что счетчики обновляются корректно
6. Проверьте что рекламодатель видит все предложения

## Логирование

Все критичные операции логируются:
- Создание офферов (успех/ошибка)
- Запуск кампаний
- Автоматическая отправка предложений
- Количество созданных предложений

Пример лога:
```
[AutoCampaignsService] Created 5 offers for campaign abc-123-def
[OffersService] Failed to create offer: Campaign not found
```
