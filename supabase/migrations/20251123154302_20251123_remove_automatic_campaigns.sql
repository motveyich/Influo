/*
  # Удаление функциональности автоматических кампаний

  ## Описание
  Полное удаление всех полей, триггеров и функций связанных с автоматическими кампаниями.
  Система возвращается к простым обычным кампаниям.

  ## Удаляемые объекты

  ### Из таблицы campaigns:
  - is_automatic
  - automatic_settings

  ### Триггеры и функции:
  - check_campaign_recruitment_complete()
  - notify_influencer_dropout()
  - trigger_check_recruitment_complete
  - trigger_notify_dropout

  ### Из таблицы offers:
  - current_stage (не используется)
  - initiated_by (не используется)

  ### Обновление статусов:
  - in_progress → active (упрощаем статусы)
*/

-- Удаляем триггеры
DROP TRIGGER IF EXISTS trigger_check_recruitment_complete ON offers;
DROP TRIGGER IF EXISTS trigger_notify_dropout ON offers;

-- Удаляем функции
DROP FUNCTION IF EXISTS check_campaign_recruitment_complete() CASCADE;
DROP FUNCTION IF EXISTS notify_influencer_dropout() CASCADE;

-- Обновляем статусы в campaigns (in_progress -> active)
UPDATE campaigns SET status = 'active' WHERE status = 'in_progress';

-- Удаляем поля из campaigns
ALTER TABLE campaigns DROP COLUMN IF EXISTS is_automatic;
ALTER TABLE campaigns DROP COLUMN IF EXISTS automatic_settings;

-- Удаляем неиспользуемые поля из offers
ALTER TABLE offers DROP COLUMN IF EXISTS current_stage;
ALTER TABLE offers DROP COLUMN IF EXISTS initiated_by;

-- Обновляем constraint для статусов campaigns (убираем in_progress)
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled'));

-- Удаляем индексы связанные с автокампаниями
DROP INDEX IF EXISTS idx_campaigns_is_automatic;
DROP INDEX IF EXISTS idx_offers_current_stage;
DROP INDEX IF EXISTS idx_offers_initiated_by;

-- Комментарий
COMMENT ON TABLE campaigns IS 'Обычные рекламные кампании без автоматизации';
