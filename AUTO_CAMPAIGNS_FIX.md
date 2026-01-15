# Исправление автоматической рассылки предложений в автокампаниях

## Проблема

Автоматическая рассылка предложений инфлюенсерам при запуске автокампании **не работала совсем**.

### Основная причина

**Несоответствие регистра названий платформ:**

- В таблице `auto_campaigns` платформы хранились с заглавной буквы: `'Instagram'`, `'TikTok'`, `'YouTube'`
- В таблице `influencer_cards` платформы хранятся в нижнем регистре: `'instagram'`, `'tiktok'`, `'youtube'`
- При фильтрации использовалось прямое сравнение: `campaign.platforms.includes(card.platform)`
- Результат: `['Instagram'].includes('instagram')` → **FALSE**

**Ни одна карточка инфлюенсера никогда не проходила фильтрацию по платформе!**

### Дополнительные проблемы

1. **Недостаточное логирование** - невозможно было понять, почему не работает
2. **Перезапись счетчика** - `sent_offers_count` перезаписывался вместо инкремента
3. **Тихий провал** - если карточек не находилось, система не сообщала об ошибке

---

## Решение

### 1. Приведение к единому формату (нижний регистр)

**Файл:** `backend/src/modules/auto-campaigns/dto/create-auto-campaign.dto.ts`

```typescript
export enum CampaignPlatform {
  INSTAGRAM = 'instagram',  // было 'Instagram'
  TIKTOK = 'tiktok',        // было 'TikTok'
  YOUTUBE = 'youtube',      // было 'YouTube'
  TWITTER = 'twitter',      // было 'Twitter'
}
```

### 2. Безопасное сравнение платформ

**Файл:** `backend/src/modules/auto-campaigns/auto-campaigns.service.ts`

Методы `sendOffersToMatchingInfluencers` и `getMatches`:

```typescript
// Преобразуем платформы к нижнему регистру для сравнения
const campaignPlatformsLower = campaign.platforms.map((p: string) => p.toLowerCase());

// Безопасное сравнение с учетом регистра
const matchesPlatform = campaignPlatformsLower.includes(card.platform.toLowerCase());
```

Это обеспечивает совместимость даже если останутся старые данные с заглавными буквами.

### 3. Детальное логирование

Добавлено подробное логирование на каждом этапе:

```typescript
this.logger.log(`Starting auto-offer distribution for campaign ${campaignId}`);
this.logger.log(`Campaign criteria: platforms=[${campaign.platforms}], audience=${campaign.audience_min}-${campaign.audience_max}, target=${campaign.target_influencers_count}`);
this.logger.log(`Found ${influencerCards.length} active influencer cards`);
this.logger.log(`Matched ${matchedCards.length} cards after platform and audience filtering`);
this.logger.log(`Available cards after excluding existing offers: ${availableCards.length}`);
this.logger.log(`Will create ${cardsToSend.length} offers`);
this.logger.log(`Successfully created ${offersToCreate.length} offers for campaign ${campaignId}. Total sent: ${newSentCount}`);
```

### 4. Правильный инкремент счетчика

Вместо перезаписи счетчика:

```typescript
// Получаем текущее значение
const { data: currentCampaign } = await supabase
  .from('auto_campaigns')
  .select('sent_offers_count')
  .eq('id', campaignId)
  .maybeSingle();

// Инкрементируем
const newSentCount = (currentCampaign?.sent_offers_count || 0) + offersToCreate.length;

// Обновляем
await supabase
  .from('auto_campaigns')
  .update({ sent_offers_count: newSentCount })
  .eq('id', campaignId);
```

### 5. Валидация данных кампании

Добавлены проверки перед началом рассылки:

```typescript
if (!campaign.platforms || campaign.platforms.length === 0) {
  this.logger.error(`Campaign ${campaignId} has no platforms specified`);
  return;
}

if (!campaign.audience_min || !campaign.audience_max) {
  this.logger.error(`Campaign ${campaignId} has invalid audience range`);
  return;
}

if (!campaign.target_influencers_count || campaign.target_influencers_count <= 0) {
  this.logger.error(`Campaign ${campaignId} has invalid target influencers count`);
  return;
}
```

### 6. Миграция базы данных

**Файл:** `supabase/migrations/[timestamp]_normalize_auto_campaigns_platforms.sql`

Приведение всех существующих данных к нижнему регистру:

```sql
UPDATE auto_campaigns
SET platforms = ARRAY(
  SELECT LOWER(unnest(platforms))
)
WHERE platforms IS NOT NULL AND array_length(platforms, 1) > 0;
```

---

## Результат

Теперь автоматическая рассылка работает корректно:

1. ✅ **Платформы сравниваются правильно** - используется нижний регистр
2. ✅ **Подробное логирование** - видно каждый этап фильтрации
3. ✅ **Правильный счетчик** - инкрементируется, а не перезаписывается
4. ✅ **Валидация данных** - ошибки конфигурации не проходят незамеченными
5. ✅ **Существующие данные обновлены** - старые кампании тоже работают

---

## Как проверить

### 1. Создать автокампанию

```json
POST /api/auto-campaigns
{
  "title": "Test Campaign",
  "description": "Testing auto-offers",
  "budgetMin": 10000,
  "budgetMax": 50000,
  "audienceMin": 5000,
  "audienceMax": 100000,
  "targetInfluencersCount": 5,
  "contentTypes": ["post", "story"],
  "platforms": ["instagram", "tiktok"]
}
```

### 2. Запустить кампанию

```
POST /api/auto-campaigns/:id/launch
```

### 3. Проверить логи

В консоли бэкенда должны появиться детальные логи:

```
Starting auto-offer distribution for campaign abc-123
Campaign criteria: platforms=[instagram,tiktok], audience=5000-100000, target=5
Found 15 active influencer cards
Matched 8 cards after platform and audience filtering
Available cards after excluding existing offers: 8 (excluded 0 already contacted)
Will create 5 offers
Successfully created 5 offers for campaign abc-123. Total sent: 5
```

### 4. Проверить созданные офферы

```sql
SELECT * FROM offers WHERE auto_campaign_id = 'abc-123';
```

Должно быть создано 5 предложений для подходящих инфлюенсеров.

---

## Известные ограничения

1. **Формат платформ** - теперь строго нижний регистр во всей системе
2. **Обратная совместимость** - старые API клиенты должны использовать нижний регистр
3. **Миграция данных** - применена автоматически ко всем существующим кампаниям

---

## Связанные файлы

- `backend/src/modules/auto-campaigns/dto/create-auto-campaign.dto.ts` - enum платформ
- `backend/src/modules/auto-campaigns/auto-campaigns.service.ts` - логика рассылки
- `supabase/migrations/normalize_auto_campaigns_platforms.sql` - миграция БД
