/*
  # Полное удаление кампаний из системы

  ## Описание
  Удаление всей функциональности кампаний из базы данных.
  Система больше не использует кампании.

  ## Удаляемые объекты

  ### Таблицы:
  - campaigns (основная таблица кампаний)
  - campaign_metrics (метрики кампаний)
  
  ### Связанные объекты:
  - Все foreign keys на campaigns
  - Все индексы
  - Все триггеры
  - Все RLS политики

  ### Очистка offers:
  - Удаляем campaign_id из offers (предложения не связаны с кампаниями)
  
  ## Примечание
  После этой миграции кампании полностью удалены из системы.
  Предложения (offers) работают независимо через карточки.
*/

-- Удаляем foreign key constraints из других таблиц
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_campaign_id_fkey;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_campaign_id_fkey;

-- Удаляем campaign_id из offers
ALTER TABLE offers DROP COLUMN IF EXISTS campaign_id;

-- Удаляем campaign_id из applications
ALTER TABLE applications DROP COLUMN IF EXISTS campaign_id;

-- Удаляем таблицу campaign_metrics
DROP TABLE IF EXISTS campaign_metrics CASCADE;

-- Удаляем таблицу campaigns
DROP TABLE IF EXISTS campaigns CASCADE;

-- Комментарий
COMMENT ON DATABASE postgres IS 'System without campaigns - only direct offers through cards';
