# Исправление ошибок 400 Bad Request

## Проблема
При любых попытках сохранения данных (профиль, настройки приватности, интерфейса) возникала ошибка 400 Bad Request.

## Причина
Backend ValidationPipe был настроен с параметром `forbidNonWhitelisted: true`, что вызывало ошибку когда frontend отправлял поля, которых не было в DTO классах.

## Исправления

### 1. CreateProfileDto (`backend/src/modules/profiles/dto/create-profile.dto.ts`)
**Добавлены поля:**
- `email?: string` - Email адрес пользователя
- `avatar?: string` - URL аватара

### 2. UpdateProfileDto (`backend/src/modules/profiles/dto/update-profile.dto.ts`)
**Добавлены поля:**
- `email?: string` - Email адрес
- `avatar?: string` - URL аватара
- `userType?: string` - Тип пользователя (influencer/advertiser)
- `influencerData?: Record<string, any>` - Данные инфлюенсера
- `advertiserData?: Record<string, any>` - Данные рекламодателя
- `profileCompletion?: Record<string, any>` - Информация о заполненности профиля

### 3. ProfilesService (`backend/src/modules/profiles/profiles.service.ts`)

**Метод `create()`:**
Добавлена обработка новых полей:
- email
- avatar
- influencer_data
- advertiser_data
- profile_completion

**Метод `update()`:**
Добавлена обработка всех новых полей:
- email
- avatar
- user_type
- influencer_data
- advertiser_data
- profile_completion

**Метод `transformProfile()`:**
Добавлено возвращение новых полей:
- userId (дополнительно к id)
- influencerData
- advertiserData
- profileCompletion

## Результат
✅ POST /api/profiles - теперь работает корректно
✅ PATCH /api/profiles/:id - теперь работает корректно
✅ PUT /api/user-settings/:userId - работает корректно (UpdateSettingsDto уже содержал все необходимые поля)
✅ Frontend успешно собирается без ошибок

## Тестирование
После перезапуска backend сервера все операции сохранения должны работать без ошибок 400:
- Сохранение основной информации профиля
- Сохранение данных инфлюенсера
- Сохранение данных рекламодателя
- Обновление настроек приватности
- Обновление настроек интерфейса (тема, язык, размер шрифта)
- Обновление настроек уведомлений
