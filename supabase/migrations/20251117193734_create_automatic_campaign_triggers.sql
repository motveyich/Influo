/*
  # Создание триггеров для автоматических кампаний

  1. Триггеры
    - Автоматический переход в "in_progress" при достижении цели
    - Автоматическое истечение pending предложений
    - Уведомление о выбывании инфлюенсера

  2. Функции
    - check_recruitment_target() - проверка достижения цели
    - handle_influencer_dropout() - обработка выбывания
*/

-- Функция для проверки достижения целевого количества
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
  FROM collaboration_offers
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
    UPDATE collaboration_offers
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

-- Триггер на принятие предложения
DROP TRIGGER IF EXISTS trigger_check_recruitment_target ON collaboration_offers;
CREATE TRIGGER trigger_check_recruitment_target
  AFTER UPDATE OF status ON collaboration_offers
  FOR EACH ROW
  EXECUTE FUNCTION check_recruitment_target();

-- Функция для обработки выбывания инфлюенсера
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
        'offer_id', NEW.id
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер на выбывание инфлюенсера
DROP TRIGGER IF EXISTS trigger_handle_dropout ON collaboration_offers;
CREATE TRIGGER trigger_handle_dropout
  AFTER UPDATE OF status ON collaboration_offers
  FOR EACH ROW
  EXECUTE FUNCTION handle_influencer_dropout();
