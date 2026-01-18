# Исправление ошибки 404 при создании окна оплаты

## Проблема

При попытке создать окно оплаты (payment window) возникала ошибка **404 Not Found** с сообщением "Offer not found".

### Причина

Backend пытался обратиться к несуществующим колонкам `proposed_rate` и `currency` в таблице `offers`:
- Эти колонки НЕ существуют на верхнем уровне таблицы
- Реальная структура: данные хранятся внутри jsonb поля `details`
  - `offers.details.proposed_rate` - сумма предложения
  - `offers.details.currency` - валюта (RUB, USD и т.д.)

## Исправления

### 1. PaymentsService (`backend/src/modules/payments/payments.service.ts`)

**До:**
```typescript
const { data: offer } = await supabase
  .from('offers')
  .select('advertiser_id, influencer_id, status, proposed_rate, currency')
  .eq('offer_id', createDto.offerId)
  .maybeSingle();
```

**После:**
```typescript
const { data: offer } = await supabase
  .from('offers')
  .select('advertiser_id, influencer_id, status, details')
  .eq('offer_id', createDto.offerId)
  .maybeSingle();

if (!offer) {
  throw new NotFoundException('Offer not found');
}

const offerDetails = offer.details || {};
const proposedRate = offerDetails.proposed_rate || 0;
const offerCurrency = offerDetails.currency || 'RUB';
```

### 2. OffersService (`backend/src/modules/offers/offers.service.ts`)

**До:**
```typescript
const offerData = {
  advertiser_id: advertiserId,
  influencer_id: influencerId,
  initiated_by: userId,
  proposed_rate: createOfferDto.amount,
  currency: createOfferDto.currency,
  auto_campaign_id: createOfferDto.autoCampaignId || null,
  details: {
    title: createOfferDto.title,
    description: createOfferDto.description,
    contentType: createOfferDto.contentType,
    deliverables: createOfferDto.deliverables || [],
  },
  // ...
};
```

**После:**
```typescript
const offerData = {
  advertiser_id: advertiserId,
  influencer_id: influencerId,
  initiated_by: userId,
  auto_campaign_id: createOfferDto.autoCampaignId || null,
  details: {
    title: createOfferDto.title,
    description: createOfferDto.description,
    contentType: createOfferDto.contentType,
    deliverables: createOfferDto.deliverables || [],
    proposed_rate: createOfferDto.amount,
    currency: createOfferDto.currency,
  },
  // ...
};
```

### 3. AutoCampaignsService (`backend/src/modules/auto-campaigns/auto-campaigns.service.ts`)

**До:**
```typescript
const newOffer = {
  influencer_id: match.influencerId,
  advertiser_id: campaign.advertiser_id,
  proposed_rate: match.selectedPrice,
  currency: 'RUB',
  status: 'pending',
  details: {
    title: `Предложение о сотрудничестве: ${campaign.title}`,
    // ...
  },
  // ...
};
```

**После:**
```typescript
const newOffer = {
  influencer_id: match.influencerId,
  advertiser_id: campaign.advertiser_id,
  status: 'pending',
  details: {
    title: `Предложение о сотрудничестве: ${campaign.title}`,
    // ... другие поля
    proposed_rate: match.selectedPrice,
    currency: 'RUB',
    // ...
  },
  // ...
};
```

## Результат

✅ Исправлена ошибка 404 при создании окна оплаты
✅ Все данные теперь корректно сохраняются и извлекаются из `details` jsonb поля
✅ Backend успешно собирается и готов к работе
✅ Frontend успешно собирается
✅ Структура данных соответствует реальной схеме базы данных

## Структура данных в БД

Пример offer в базе данных:
```json
{
  "offer_id": "3dda4370-4c6b-45b4-a1f6-9d9603a11aac",
  "advertiser_id": "b8d772ff-8a2f-411f-84ee-10698385d31d",
  "influencer_id": "854964e9-5ec3-492e-9b70-8e46ef01b2ed",
  "status": "in_progress",
  "details": {
    "title": "Предложение о сотрудничестве: вввввввввввввв",
    "currency": "RUB",
    "platform": "instagram",
    "description": "ввввввввввв",
    "proposed_rate": 1000,
    "content_type": "post",
    "deliverables": ["post"]
  }
}
```

## Примечания

- Методы `transformOffer` в обоих сервисах были уже правильно реализованы с проверкой значений из `details` в первую очередь
- Обратная совместимость сохранена через цепочку fallback: `details.proposed_rate || offer.proposed_rate || offer.amount || 0`
