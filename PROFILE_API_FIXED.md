# Исправление API профиля: Email и JSON поля

## Проблемы (было)

1. **Email конфликт**: При обновлении профиля возникала ошибка 500/409 из-за попытки обновить email через endpoint профиля
2. **JSON поля**: Backend не принимал `null` для `influencerData` и `advertiserData`, хотя frontend иногда отправлял `null`

## Решение (стало)

### Backend изменения

#### 1. UpdateProfileDto - убран email
**Файл**: `backend/src/modules/profiles/dto/update-profile.dto.ts`

```typescript
// УДАЛЕНО:
// email?: string;

// ДОБАВЛЕНО для JSON полей:
@ApiProperty({
  description: 'Influencer data (object or null to clear)',
  required: false,
  nullable: true,
})
@IsOptional()
@ValidateIf((o) => o.influencerData !== null)
@IsObject()
influencerData?: Record<string, any> | null;

@ApiProperty({
  description: 'Advertiser data (object or null to clear)',
  required: false,
  nullable: true,
})
@IsOptional()
@ValidateIf((o) => o.advertiserData !== null)
@IsObject()
advertiserData?: Record<string, any> | null;
```

#### 2. ProfilesService - убрана логика email
**Файл**: `backend/src/modules/profiles/profiles.service.ts`

**Изменения**:
- Удалена проверка email на уникальность
- Удалено обновление поля email в базе данных
- Исправлена обработка JSON полей для поддержки `null`

```typescript
// БЫЛО:
if (updateProfileDto.influencerData && typeof updateProfileDto.influencerData === 'object') {
  updateData.influencer_data = updateProfileDto.influencerData;
} else {
  this.logger.warn(`Invalid influencerData format, skipping`);
}

// СТАЛО:
if (updateProfileDto.influencerData !== undefined) {
  // null = clear the field, object = update, undefined = don't change
  if (updateProfileDto.influencerData === null) {
    updateData.influencer_data = null;
    this.logger.log(`Clearing influencerData for user ${userId}`);
  } else if (typeof updateProfileDto.influencerData === 'object') {
    updateData.influencer_data = updateProfileDto.influencerData;
  } else {
    this.logger.warn(`Invalid influencerData format, skipping`);
  }
}
```

### Frontend изменения

#### ProfileService - убрана обработка ошибок email
**Файл**: `src/modules/profiles/services/profileService.ts`

```typescript
// УДАЛЕНО:
// if (error.message?.includes('Email already in use')) {
//   throw new Error('Этот email уже используется другим пользователем');
// }

// УДАЛЕНО из обработчика конфликтов:
// if (updates.email) {
//   throw new Error('Этот email уже используется другим пользователем');
// }
```

## Примеры API запросов

### 1. Обычное обновление профиля (без email)
```http
PATCH /api/profiles/{userId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "fullName": "John Doe",
  "bio": "Software developer",
  "location": "New York"
}

# Ответ:
200 OK
{
  "userId": "123",
  "fullName": "John Doe",
  "email": "user@example.com",  // не изменился
  "bio": "Software developer",
  "location": "New York"
}
```

### 2. Legacy клиент отправляет email (игнорируется)
```http
PATCH /api/profiles/{userId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "fullName": "John Doe",
  "email": "newemail@example.com"  // будет проигнорировано
}

# Ответ:
200 OK
{
  "userId": "123",
  "fullName": "John Doe",
  "email": "user@example.com"  // не изменился!
}
```

### 3. Очистка influencerData (установка null)
```http
PATCH /api/profiles/{userId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "influencerData": null
}

# Ответ:
200 OK
{
  "userId": "123",
  "fullName": "John Doe",
  "influencerData": null  // поле очищено
}
```

### 4. Обновление influencerData
```http
PATCH /api/profiles/{userId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "influencerData": {
    "mainSocialLink": "https://instagram.com/user",
    "category": "lifestyle",
    "totalFollowers": 10000
  }
}

# Ответ:
200 OK
{
  "userId": "123",
  "influencerData": {
    "mainSocialLink": "https://instagram.com/user",
    "category": "lifestyle",
    "totalFollowers": 10000
  }
}
```

### 5. Частичное обновление (без influencerData/advertiserData)
```http
PATCH /api/profiles/{userId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "bio": "New bio"
  // influencerData не указан = не меняется
}

# Ответ:
200 OK
{
  "userId": "123",
  "bio": "New bio",
  "influencerData": { /* старое значение не изменилось */ }
}
```

## Семантика обновления JSON полей

| Значение | Действие |
|----------|---------|
| `undefined` (поле не указано) | Не менять поле в БД |
| `null` | Очистить поле (установить NULL в БД) |
| `{ ... }` (объект) | Заменить значение на новое |

## Важно

1. **Email управляется только через Supabase Auth** - для изменения email используйте `supabase.auth.updateUser({ email: newEmail })`
2. **Email в user_profiles** - это read-only поле для отображения, оно НЕ должно обновляться через `/profiles` endpoint
3. **Валидация** - DTO теперь корректно принимает `null` для JSON полей
4. **Обратная совместимость** - старые клиенты могут отправлять email, но он будет проигнорирован

## Проверка исправления

После применения этих изменений:
- ✅ НЕТ ошибки уникальности email при сохранении профиля
- ✅ НЕТ 500 Internal Server Error
- ✅ JSON поля корректно обрабатывают null
- ✅ Email остается read-only и управляется через auth систему
