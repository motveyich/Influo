# Исправление валидации файлов при загрузке скриншотов

## Проблема

Пользователи не могли завершить сотрудничество, загружая скриншоты в формате JPEG. Ошибка возникала при валидации файлов на бэкенде.

**Ошибка:** `BadRequestException: Validation failed (current file type is image/jpeg, expected type is .(png|jpg|jpeg|jpe|jfif|webp))`

## Причина

`FileTypeValidator` в NestJS проверяет MIME-тип файла (например, `image/jpeg`), но в коде использовалось регулярное выражение для расширений файлов `'.(png|jpg|jpeg|jpe|jfif|webp)'`, которое не соответствует формату MIME-типов.

## Решение

Изменены валидаторы файлов в следующих контроллерах:

### 1. backend/src/modules/offers/offers.controller.ts (строка 180)

**Было:**
```typescript
new FileTypeValidator({ fileType: '.(png|jpg|jpeg|jpe|jfif|webp)' })
```

**Стало:**
```typescript
new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|jpe|jfif|png|webp)$/ })
```

### 2. backend/src/modules/applications/applications.controller.ts (строка 127)

**Было:**
```typescript
new FileTypeValidator({ fileType: '.(png|jpg|jpeg|jpe|jfif|webp)' })
```

**Стало:**
```typescript
new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|jpe|jfif|png|webp)$/ })
```

### 3. backend/src/modules/profiles/profiles.controller.ts

Уже использовал правильное регулярное выражение (не требовалось изменений):
```typescript
new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ })
```

## Поддерживаемые форматы

После исправления API принимает следующие форматы изображений:
- JPEG/JPG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)
- JPE (image/jpe)
- JFIF (image/jfif)

## Тестирование

Проверено:
- ✅ Загрузка файлов .jpg/.jpeg
- ✅ Загрузка файлов .png
- ✅ Загрузка файлов .webp
- ✅ Отклонение файлов неправильного формата
- ✅ Проверка размера файла (макс. 10 МБ)
- ✅ Сборка проекта

## Статус

✅ Исправление применено и протестировано.
