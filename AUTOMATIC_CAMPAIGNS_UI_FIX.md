# Исправление UI автоматических кампаний

## Проблема
После переработки системы автоматических кампаний:
- ❌ Кнопка "Только для автоматических" была неактивна
- ❌ Не было возможности запустить кампанию из черновика
- ❌ Не было возможности редактировать черновики
- ❌ Рассылка не запускалась через кнопку "Поиск инфлюенсеров"

## Исправления

### 1. CampaignCard.tsx

**Обновлена проверка автокампании:**
```typescript
// Старое (неработающее)
const isAutomaticCampaign = (campaign as any).metadata?.isAutomatic;
const automaticSettings = (campaign as any).metadata?.automaticSettings;

// Новое (работает)
const isAutomaticCampaign = (campaign as any).is_automatic;
const automaticSettings = (campaign as any).automatic_settings;
```

**Добавлен статус "В работе":**
```typescript
case 'in_progress':
  return 'bg-blue-100 text-blue-800';
```

**Обновлены кнопки управления:**
- ✅ **Черновик**: кнопка "Запустить кампанию" (зеленая)
- ✅ **Активна/В работе**: кнопка "Перезапустить подбор" (синяя)
- ✅ **Приостановлена**: кнопка "Возобновить кампанию" (желтая)
- ✅ Кнопка "Редактировать" показывается только для черновиков

### 2. CampaignsPage.tsx

**Обновлена функция запуска:**
```typescript
const handleFindInfluencers = async (campaign: Campaign) => {
  const isAutomatic = (campaign as any).is_automatic;

  if (!isAutomatic) {
    toast.error('Эта функция доступна только для автоматических кампаний');
    return;
  }

  try {
    setIsLoading(true);
    const { automaticCampaignService } = await import('../services/automaticCampaignService');

    if (campaign.status === 'draft') {
      // Первый запуск из черновика
      await automaticCampaignService.startAutomaticCampaign(campaign.campaignId);
      toast.success('Кампания запущена! Рассылка предложений началась.');
    } else if (campaign.status === 'paused') {
      // Возобновление приостановленной
      await automaticCampaignService.resumeAutomaticCampaign(campaign.campaignId);
      toast.success('Кампания возобновлена!');
    } else {
      // Перезапуск активной
      await automaticCampaignService.startAutomaticCampaign(campaign.campaignId);
      toast.success('Подбор инфлюенсеров перезапущен!');
    }

    await loadCampaigns();
  } catch (error: any) {
    console.error('Error starting campaign:', error);
    toast.error(error.message || 'Ошибка запуска кампании');
  } finally {
    setIsLoading(false);
  }
};
```

**Обновлена функция редактирования:**
```typescript
const handleEditCampaign = (campaign: Campaign) => {
  if (campaign.status !== 'draft') {
    toast.error('Редактирование доступно только для черновиков');
    return;
  }

  setEditingCampaign(campaign);
  const isAutomaticCampaign = (campaign as any).is_automatic;
  if (isAutomaticCampaign) {
    setShowAutomaticModal(true);
  } else {
    setShowCampaignModal(true);
  }
};
```

## Как это работает теперь

### Сценарий 1: Создание и запуск новой автокампании

1. Нажать "Создать автоматическую кампанию"
2. Заполнить 3 шага в модальном окне
3. Нажать "Создать автокампанию"
4. Кампания создается со статусом **Черновик**
5. На карточке появляется зеленая кнопка **"Запустить кампанию"**
6. Нажать "Запустить кампанию"
7. Статус меняется на **Активна**
8. Вызывается Edge Function `trigger-automatic-offers`
9. Система рассылает предложения лучшим инфлюенсерам
10. Тост: "Кампания запущена! Рассылка предложений началась."

### Сценарий 2: Редактирование черновика

1. На карточке кампании со статусом **Черновик** есть кнопка **"Редактировать"**
2. Нажать "Редактировать"
3. Открывается модальное окно с заполненными данными
4. Изменить нужные поля
5. Сохранить изменения
6. Кампания остается в статусе **Черновик**

### Сценарий 3: Перезапуск активной кампании

1. Кампания в статусе **Активна** или **В работе**
2. На карточке есть синяя кнопка **"Перезапустить подбор"**
3. Нажать "Перезапустить подбор"
4. Система снова рассылает предложения
5. Тост: "Подбор инфлюенсеров перезапущен!"

### Сценарий 4: Возобновление приостановленной кампании

1. Кампания в статусе **Приостановлена**
2. На карточке есть желтая кнопка **"Возобновить кампанию"**
3. Нажать "Возобновить кампанию"
4. Статус меняется на **Активна**
5. Тост: "Кампания возобновлена!"

## Статусы кампаний

| Статус | Цвет | Действия |
|--------|------|----------|
| **Черновик** | Серый | • Запустить<br>• Редактировать<br>• Удалить |
| **Активна** | Зеленый | • Перезапустить подбор<br>• Приостановить<br>• Остановить |
| **В работе** | Синий | • Перезапустить подбор<br>• Остановить |
| **Приостановлена** | Желтый | • Возобновить<br>• Удалить |
| **Завершена** | Фиолетовый | • Просмотр |
| **Отменена** | Красный | • Просмотр |

## Что происходит при запуске

### Frontend (CampaignsPage.tsx)
```
handleFindInfluencers()
  ↓
automaticCampaignService.startAutomaticCampaign(campaignId)
  ↓
UPDATE campaigns SET status = 'active' WHERE campaign_id = ?
  ↓
fetch('/functions/v1/trigger-automatic-offers', { campaignId })
```

### Backend (Edge Function)
```
trigger-automatic-offers
  ↓
1. Загрузить кампанию из БД
2. Проверить is_automatic = true
3. Загрузить automatic_settings
4. Найти все карточки инфлюенсеров
5. Фильтровать по критериям
6. Оценить каждого (scoring)
7. Взять топ N инфлюенсеров
8. Для каждого:
   - Найти подходящий тип контента
   - Создать offer в таблице offers
9. Вернуть статистику
```

### Database (Триггеры)
```
Когда offer.status = 'accepted':
  check_campaign_recruitment_complete()
    ↓
  IF accepted_count >= targetInfluencerCount:
    - campaigns.status = 'in_progress'
    - pending offers → 'expired'

Когда offer.status = 'cancelled':
  notify_influencer_dropout()
    ↓
  IF autoReplacement = true:
    - Отправить уведомление
    - Можно запустить замену
```

## Проверено

- ✅ Сборка проекта успешна
- ✅ TypeScript без ошибок
- ✅ Кнопки отображаются правильно
- ✅ Функции запуска/остановки работают

## Файлы изменены

1. `src/modules/campaigns/components/CampaignCard.tsx`
   - Обновлена проверка `is_automatic`
   - Добавлен статус `in_progress`
   - Обновлены кнопки управления

2. `src/modules/campaigns/components/CampaignsPage.tsx`
   - Реализован `handleFindInfluencers()` с полным функционалом
   - Обновлен `handleEditCampaign()` с проверкой статуса
   - Добавлена загрузка после изменений
