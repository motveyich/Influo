/*
  # Полная переработка системы автоматических кампаний и предложений

  ## Описание
  Это полная переработка с нуля системы автоматических кампаний.
  Удаляется весь устаревший код, дублирующиеся таблицы и триггеры.
  Создается чистая, простая и понятная структура.

  ## 1. Очистка старых объектов

  ### Удаляемые таблицы:
  - `collaboration_offers` (дубликат offers, больше не используется)
  - `collaboration_forms` (не используется)

  ### Удаляемые триггеры и функции:
  - Все триггеры автоматических кампаний (будут переписаны)
  - Функции check_recruitment_target, handle_influencer_dropout

  ## 2. Обновление таблицы campaigns

  ### Новые поля:
  - `is_automatic` (boolean) - флаг автоматической кампании
  - `automatic_settings` (jsonb) - настройки автоподбора

  ### Обновленные статусы:
  - `draft` - черновик
  - `active` - активна (идет набор)
  - `paused` - приостановлена
  - `in_progress` - в работе (набор завершен)
  - `completed` - завершена
  - `cancelled` - отменена

  ## 3. Обновление таблицы offers

  ### Статусы offers:
  - `pending` - ожидает ответа
  - `accepted` - принято
  - `declined` - отклонено
  - `counter` - встречное предложение
  - `in_progress` - в работе
  - `completed` - завершено
  - `cancelled` - отменено (включает terminated)
  - `withdrawn` - отозвано
  - `expired` - истекло

  ## 4. Новые триггеры

  ### check_campaign_recruitment_complete()
  Когда количество accepted offers достигает targetInfluencerCount:
  - Переводит кампанию в `in_progress`
  - Истекает все `pending` offers

  ### notify_influencer_dropout()
  Когда инфлюенсер выбывает - отправляет уведомление для автозамены

  ## 5. Безопасность
  RLS политики для безопасного доступа
*/

-- =====================================================
-- ЧАСТЬ 1: ОЧИСТКА
-- =====================================================

-- Удаляем старые триггеры
DROP TRIGGER IF EXISTS trigger_check_recruitment_target ON offers;
DROP TRIGGER IF EXISTS trigger_check_recruitment_target ON collaboration_offers;
DROP TRIGGER IF EXISTS trigger_handle_dropout ON offers;
DROP TRIGGER IF EXISTS trigger_handle_dropout ON collaboration_offers;

-- Удаляем старые функции
DROP FUNCTION IF EXISTS check_recruitment_target() CASCADE;
DROP FUNCTION IF EXISTS handle_influencer_dropout() CASCADE;

-- Удаляем устаревшие таблицы
DROP TABLE IF EXISTS collaboration_offers CASCADE;
DROP TABLE IF EXISTS collaboration_forms CASCADE;

-- =====================================================
-- ЧАСТЬ 2: ОБНОВЛЕНИЕ CAMPAIGNS
-- =====================================================

-- Добавляем новые поля
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS automatic_settings JSONB DEFAULT NULL;

-- Переносим данные из metadata в automatic_settings
UPDATE campaigns 
SET 
  is_automatic = (metadata->'automaticSettings') IS NOT NULL,
  automatic_settings = metadata->'automaticSettings'
WHERE (metadata->'automaticSettings') IS NOT NULL;

-- Обновляем constraint для статусов
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('draft', 'active', 'paused', 'in_progress', 'completed', 'cancelled'));

-- Создаем индекс
CREATE INDEX IF NOT EXISTS idx_campaigns_is_automatic ON campaigns(is_automatic) 
  WHERE is_automatic = true;

-- =====================================================
-- ЧАСТЬ 3: ОБНОВЛЕНИЕ OFFERS
-- =====================================================

-- Добавляем недостающие поля если их нет
ALTER TABLE offers ADD COLUMN IF NOT EXISTS influencer_card_id UUID;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'offer_sent';

-- Нормализуем статусы (terminated -> cancelled)
UPDATE offers SET status = 'cancelled' WHERE status = 'terminated';
UPDATE offers SET status = 'cancelled' WHERE status = 'rejected';

-- Обновляем constraint для статусов
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined', 'counter', 'in_progress', 'completed', 'cancelled', 'withdrawn', 'expired'));

-- Создаем недостающие индексы
CREATE INDEX IF NOT EXISTS idx_offers_campaign_id ON offers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_offers_influencer_id ON offers(influencer_id);
CREATE INDEX IF NOT EXISTS idx_offers_advertiser_id ON offers(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_offers_influencer_card_id ON offers(influencer_card_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_initiated_by ON offers(initiated_by);
CREATE INDEX IF NOT EXISTS idx_offers_campaign_status ON offers(campaign_id, status);

-- =====================================================
-- ЧАСТЬ 4: ТРИГГЕРЫ
-- =====================================================

-- Функция: проверка завершения набора
CREATE OR REPLACE FUNCTION check_campaign_recruitment_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_target_count INTEGER;
  v_accepted_count INTEGER;
  v_campaign_status TEXT;
  v_is_automatic BOOLEAN;
BEGIN
  -- Только при изменении статуса на accepted
  IF NEW.status != 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Получаем данные кампании
  SELECT 
    status,
    is_automatic,
    (automatic_settings->>'targetInfluencerCount')::INTEGER
  INTO 
    v_campaign_status,
    v_is_automatic,
    v_target_count
  FROM campaigns
  WHERE campaign_id = NEW.campaign_id;

  -- Проверяем условия
  IF v_campaign_status != 'active' OR 
     v_is_automatic != true OR 
     v_target_count IS NULL THEN
    RETURN NEW;
  END IF;

  -- Считаем принятые предложения
  SELECT COUNT(*)
  INTO v_accepted_count
  FROM offers
  WHERE campaign_id = NEW.campaign_id
    AND status = 'accepted';

  -- Если цель достигнута
  IF v_accepted_count >= v_target_count THEN
    -- Обновляем статус кампании
    UPDATE campaigns
    SET 
      status = 'in_progress',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{recruitmentCompletedAt}',
        to_jsonb(NOW())
      ),
      updated_at = NOW()
    WHERE campaign_id = NEW.campaign_id;

    -- Истекаем pending offers
    UPDATE offers
    SET 
      status = 'expired',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{expiredReason}',
        '"recruitment_completed"'::jsonb
      ),
      updated_at = NOW()
    WHERE campaign_id = NEW.campaign_id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер на offers
CREATE TRIGGER trigger_check_recruitment_complete
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  EXECUTE FUNCTION check_campaign_recruitment_complete();

-- Функция: уведомление о выбывании
CREATE OR REPLACE FUNCTION notify_influencer_dropout()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_status TEXT;
  v_auto_replacement BOOLEAN;
BEGIN
  -- Только при переходе из accepted в cancelled/withdrawn
  IF OLD.status != 'accepted' OR 
     NEW.status NOT IN ('cancelled', 'withdrawn') THEN
    RETURN NEW;
  END IF;

  -- Получаем данные кампании
  SELECT 
    status,
    (automatic_settings->>'autoReplacement')::BOOLEAN
  INTO 
    v_campaign_status,
    v_auto_replacement
  FROM campaigns
  WHERE campaign_id = NEW.campaign_id;

  -- Если кампания в работе и включена автозамена
  IF v_campaign_status = 'in_progress' AND v_auto_replacement = true THEN
    PERFORM pg_notify(
      'influencer_dropout',
      json_build_object(
        'campaign_id', NEW.campaign_id,
        'offer_id', NEW.offer_id,
        'influencer_id', NEW.influencer_id
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер на offers
CREATE TRIGGER trigger_notify_dropout
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_influencer_dropout();

-- =====================================================
-- ЧАСТЬ 5: RLS ПОЛИТИКИ
-- =====================================================

-- Обновляем RLS для campaigns
DROP POLICY IF EXISTS "Advertisers can view own campaigns" ON campaigns;
CREATE POLICY "Advertisers can view own campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (advertiser_id = auth.uid());

DROP POLICY IF EXISTS "Advertisers can insert own campaigns" ON campaigns;
CREATE POLICY "Advertisers can insert own campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    advertiser_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_type = 'advertiser'
    )
  );

DROP POLICY IF EXISTS "Advertisers can update own campaigns" ON campaigns;
CREATE POLICY "Advertisers can update own campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (advertiser_id = auth.uid())
  WITH CHECK (advertiser_id = auth.uid());

DROP POLICY IF EXISTS "Advertisers can delete own campaigns" ON campaigns;
CREATE POLICY "Advertisers can delete own campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (advertiser_id = auth.uid());

-- Проверяем и создаем политики offers если их нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Influencers can view offers for them'
  ) THEN
    CREATE POLICY "Influencers can view offers for them"
      ON offers FOR SELECT
      TO authenticated
      USING (influencer_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Advertisers can view own offers'
  ) THEN
    CREATE POLICY "Advertisers can view own offers"
      ON offers FOR SELECT
      TO authenticated
      USING (advertiser_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Advertisers can create offers'
  ) THEN
    CREATE POLICY "Advertisers can create offers"
      ON offers FOR INSERT
      TO authenticated
      WITH CHECK (advertiser_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Users can update relevant offers'
  ) THEN
    CREATE POLICY "Users can update relevant offers"
      ON offers FOR UPDATE
      TO authenticated
      USING (
        influencer_id = auth.uid() OR 
        advertiser_id = auth.uid()
      )
      WITH CHECK (
        influencer_id = auth.uid() OR 
        advertiser_id = auth.uid()
      );
  END IF;
END $$;
