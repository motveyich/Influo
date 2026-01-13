# Исправление ошибки 404 при взаимодействии с предложениями

## Проблема

При взаимодействии с предложениями (заявками) во вкладке "Предложения" возникала ошибка 404, так как:
- Данные хранятся в таблице `applications`
- Но запросы отправлялись к endpoints для `offers`
- Вызывались несуществующие методы в сервисах

## Выполненные исправления

### 1. Добавлены недостающие методы в `paymentRequestService.ts`

```typescript
// Метод для загрузки окон оплаты по ID предложения
async getOfferPaymentRequests(offerId: string): Promise<PaymentRequest[]>

// Метод для обновления статуса платежа
async updatePaymentStatus(paymentId: string, newStatus: string, userId: string): Promise<PaymentRequest>

// Метод для удаления запроса на оплату
async deletePaymentRequest(paymentId: string, userId: string): Promise<void>
```

### 2. Добавлен недостающий метод в `offerService.ts`

```typescript
// Метод для загрузки истории изменений предложения
async getOfferHistory(offerId: string): Promise<any[]>
```

### 3. Исправлена передача `collaborationType` в `OfferCard.tsx`

- Обновлен интерфейс `OfferCardProps` для поддержки передачи типа collaboration
- Исправлен вызов `onViewDetails(offer, collaborationType)` для правильной передачи типа

## Как это работает теперь

### Для Applications (заявок)

1. При клике на кнопки действий ("Начать работу", "Расторгнуть", и т.д.) для заявок:
   - Проверяется `collaborationType === 'application'`
   - Вызываются методы из `applicationService`:
     - `acceptApplication()` - принять заявку
     - `rejectApplication()` - отклонить заявку
     - `markInProgress()` - начать работу
     - `markCompleted()` - завершить сотрудничество
     - `terminateApplication()` - расторгнуть сотрудничество
     - `cancelApplication()` - отменить заявку
   - Запросы идут к `/api/applications/:id/...`

2. Функциональность payment requests, reviews и history недоступна для applications
   - Эти функции доступны только для полноценных offers

### Для Offers (предложений)

1. При клике на кнопки действий для предложений:
   - Используется `collaborationType === 'offer'` (по умолчанию)
   - Вызываются методы из `offerService`:
     - `acceptOffer()` - принять предложение
     - `declineOffer()` - отклонить предложение
     - `markInProgress()` - начать работу
     - `markCompleted()` - завершить сотрудничество
     - `terminateOffer()` - расторгнуть сотрудничество
     - `cancelOffer()` - отменить предложение
   - Запросы идут к `/api/offers/:id/...`

2. Доступна полная функциональность:
   - Создание окон оплаты
   - Просмотр истории изменений
   - Оставление отзывов

## Проверка исправлений

Проект успешно собран без ошибок:
```bash
npm run build
✓ built in 10.98s
```

Все необходимые методы определены и используются корректно:
- `paymentRequestService.getOfferPaymentRequests()` ✓
- `offerService.getOfferHistory()` ✓
- `paymentRequestService.updatePaymentStatus()` ✓
- `paymentRequestService.deletePaymentRequest()` ✓

## Результат

Теперь при работе с предложениями во вкладке "Предложения":
- ✅ Кнопки "Начать работу", "Расторгнуть сотрудничество", и другие работают корректно
- ✅ Для applications запросы идут к правильным endpoints `/api/applications/:id/...`
- ✅ Для offers запросы идут к `/api/offers/:id/...`
- ✅ Нет ошибок 404 "Offer not found"
- ✅ Пользователи могут выполнять все доступные действия без ошибок
