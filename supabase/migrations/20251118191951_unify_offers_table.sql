/*
  # Унификация таблицы предложений (offers)

  1. Изменения
    - Добавляем поля для поддержки автоматических кампаний
    - Обновляем статусы для поддержки всех состояний
    - Добавляем поля из collaboration_offers
    - Обновляем триггеры для работы с offers

  2. Новые поля
    - influencer_card_id - ссылка на карточку инфлюенсера
    - current_stage - текущий этап сотрудничества
    - initiated_by - кто инициировал предложение
*/

-- Добавляем недостающие поля в таблицу offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS influencer_card_id UUID;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'offer_sent';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL;

-- Обновляем constraint для статусов (добавляем новые статусы из collaboration_offers)
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'counter', 'completed', 'rejected', 'cancelled', 'withdrawn', 'terminated', 'expired'));

-- Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_offers_influencer_card ON offers(influencer_card_id);
CREATE INDEX IF NOT EXISTS idx_offers_current_stage ON offers(current_stage);
CREATE INDEX IF NOT EXISTS idx_offers_initiated_by ON offers(initiated_by);

-- Обновляем функцию проверки достижения целевого количества для работы с offers
DROP FUNCTION IF EXISTS check_recruitment_target() CASCADE;
CREATE OR REPLACE FUNCTION check_recruitment_target()
RETURNS TRIGGER AS $$
DECLARE
  target_count INTEGER;
  accepted_count INTEGER;
  campaign_status TEXT;
BEGIN
  -- Проверяем, что это принятие предложения
  IF NEW.status != 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Получаем статус кампании
  SELECT status INTO campaign_status
  FROM campaigns
  WHERE campaign_id = NEW.campaign_id;

  -- Если кампания не active, не делаем ничего
  IF campaign_status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Получаем целевое количество из metadata кампании
  SELECT (metadata->'automaticSettings'->>'targetInfluencerCount')::INTEGER
  INTO target_count
  FROM campaigns
  WHERE campaign_id = NEW.campaign_id;

  -- Если целевое количество не установлено, не делаем ничего
  IF target_count IS NULL THEN
    RETURN NEW;
  END IF;

  -- Подсчитываем количество принятых предложений
  SELECT COUNT(*)
  INTO accepted_count
  FROM offers
  WHERE campaign_id = NEW.campaign_id
    AND status = 'accepted';

  -- Если цель достигнута
  IF accepted_count >= target_count THEN
    -- Обновляем статус кампании
    UPDATE campaigns
    SET status = 'in_progress',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{recruitmentCompletedAt}',
          to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE campaign_id = NEW.campaign_id;

    -- Истекаем все pending предложения
    UPDATE offers
    SET status = 'expired',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{expirationReason}',
          '"recruitment_completed"'::jsonb
        ),
        updated_at = NOW()
    WHERE campaign_id = NEW.campaign_id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер на таблице offers
DROP TRIGGER IF EXISTS trigger_check_recruitment_target ON offers;
CREATE TRIGGER trigger_check_recruitment_target
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  EXECUTE FUNCTION check_recruitment_target();

-- Обновляем функцию обработки выбывания инфлюенсера для работы с offers
DROP FUNCTION IF EXISTS handle_influencer_dropout() CASCADE;
CREATE OR REPLACE FUNCTION handle_influencer_dropout()
RETURNS TRIGGER AS $$
DECLARE
  campaign_status TEXT;
  auto_replacement BOOLEAN;
BEGIN
  -- Проверяем, что статус изменился на cancelled/withdrawn/terminated
  IF OLD.status NOT IN ('accepted', 'in_progress') OR
     NEW.status NOT IN ('cancelled', 'withdrawn', 'terminated') THEN
    RETURN NEW;
  END IF;

  -- Получаем статус кампании и настройки autoReplacement
  SELECT
    c.status,
    (c.metadata->'automaticSettings'->>'autoReplacement')::BOOLEAN
  INTO campaign_status, auto_replacement
  FROM campaigns c
  WHERE c.campaign_id = NEW.campaign_id;

  -- Если кампания в работе и включён автозамена
  IF campaign_status = 'in_progress' AND auto_replacement = true THEN
    -- Отправляем уведомление (обрабатывается в application code)
    PERFORM pg_notify(
      'influencer_dropout',
      json_build_object(
        'campaign_id', NEW.campaign_id,
        'influencer_id', NEW.influencer_id,
        'offer_id', NEW.offer_id
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер на таблице offers
DROP TRIGGER IF EXISTS trigger_handle_dropout ON offers;
CREATE TRIGGER trigger_handle_dropout
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  EXECUTE FUNCTION handle_influencer_dropout();

-- Комментарий: collaboration_offers больше не используется, все предложения теперь в offers
