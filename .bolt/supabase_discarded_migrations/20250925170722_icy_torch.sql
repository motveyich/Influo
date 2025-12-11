/*
  # Исправление системы предложений и аутентификации

  1. Новые таблицы
    - Исправление структуры offers для корректной логики
    - Добавление полей для правильного управления предложениями
    
  2. Безопасность
    - Обновление RLS политик для корректной работы с предложениями
    - Исправление политик восстановления аккаунтов
    
  3. Изменения
    - Исправление логики отправителя/получателя в предложениях
    - Добавление корректных полей для управления предложениями
*/

-- Обновляем таблицу offers для корректной логики предложений
DO $$
BEGIN
  -- Добавляем поле для определения инициатора предложения
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'initiated_by'
  ) THEN
    ALTER TABLE offers ADD COLUMN initiated_by uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;

  -- Добавляем поле для статуса со стороны инфлюенсера
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'influencer_response'
  ) THEN
    ALTER TABLE offers ADD COLUMN influencer_response text CHECK (influencer_response IN ('pending', 'accepted', 'declined', 'counter'));
  END IF;

  -- Добавляем поле для статуса со стороны рекламодателя
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'advertiser_response'
  ) THEN
    ALTER TABLE offers ADD COLUMN advertiser_response text CHECK (advertiser_response IN ('pending', 'accepted', 'declined', 'counter'));
  END IF;

  -- Добавляем поле для определения текущего этапа
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'current_stage'
  ) THEN
    ALTER TABLE offers ADD COLUMN current_stage text DEFAULT 'negotiation' CHECK (current_stage IN ('negotiation', 'payment', 'work', 'completion', 'review'));
  END IF;

  -- Добавляем поле для финальных условий
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'final_terms'
  ) THEN
    ALTER TABLE offers ADD COLUMN final_terms jsonb DEFAULT '{}';
  END IF;

  -- Устанавливаем значения по умолчанию для существующих записей
  UPDATE offers 
  SET 
    influencer_response = 'pending',
    advertiser_response = 'pending',
    current_stage = 'negotiation',
    final_terms = '{}'
  WHERE influencer_response IS NULL OR advertiser_response IS NULL;

END $$;

-- Обновляем RLS политики для offers
DROP POLICY IF EXISTS "Users can read own offers" ON offers;
DROP POLICY IF EXISTS "Users can update offers they're involved in" ON offers;
DROP POLICY IF EXISTS "Advertisers can create offers" ON offers;

-- Новые политики для корректной работы с предложениями
CREATE POLICY "Users can read offers they're involved in"
  ON offers
  FOR SELECT
  TO authenticated
  USING (
    (influencer_id = uid()) OR 
    (advertiser_id = uid()) OR
    (initiated_by = uid())
  );

CREATE POLICY "Users can create offers"
  ON offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (influencer_id = uid()) OR 
    (advertiser_id = uid())
  );

CREATE POLICY "Users can update offers they're involved in"
  ON offers
  FOR UPDATE
  TO authenticated
  USING (
    (influencer_id = uid()) OR 
    (advertiser_id = uid()) OR
    (initiated_by = uid())
  )
  WITH CHECK (
    (influencer_id = uid()) OR 
    (advertiser_id = uid()) OR
    (initiated_by = uid())
  );

-- Обновляем политики для user_profiles для корректного восстановления аккаунтов
DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON user_profiles;

CREATE POLICY "admin_moderator_can_manage_users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (user_id <> uid()) AND 
    (get_user_role(uid()) = ANY (ARRAY['moderator'::user_role, 'admin'::user_role]))
  )
  WITH CHECK (
    (user_id <> uid()) AND 
    (get_user_role(uid()) = ANY (ARRAY['moderator'::user_role, 'admin'::user_role]))
  );

-- Создаем функцию для получения роли пользователя если она не существует
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT COALESCE(role, 'user'::user_role)
    FROM user_profiles
    WHERE user_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем таблицу ai_chat_messages для улучшенной работы AI
DO $$
BEGIN
  -- Добавляем поле для типа анализа
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_chat_messages' AND column_name = 'analysis_type'
  ) THEN
    ALTER TABLE ai_chat_messages ADD COLUMN analysis_type text CHECK (analysis_type IN ('manual', 'auto', 'triggered'));
  END IF;

  -- Добавляем поле для контекста анализа
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_chat_messages' AND column_name = 'context_data'
  ) THEN
    ALTER TABLE ai_chat_messages ADD COLUMN context_data jsonb DEFAULT '{}';
  END IF;

END $$;

-- Создаем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_offers_initiated_by ON offers(initiated_by);
CREATE INDEX IF NOT EXISTS idx_offers_current_stage ON offers(current_stage);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_analysis_type ON ai_chat_messages(analysis_type);

-- Обновляем существующие AI сообщения
UPDATE ai_chat_messages 
SET 
  analysis_type = 'manual',
  context_data = '{}'
WHERE analysis_type IS NULL;