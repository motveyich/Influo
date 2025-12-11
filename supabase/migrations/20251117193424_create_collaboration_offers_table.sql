/*
  # Создание таблицы collaboration_offers для автоматических кампаний

  1. Новые таблицы
    - `collaboration_offers`
      - `id` (uuid, primary key) - ID предложения
      - `campaign_id` (uuid) - ID кампании
      - `influencer_id` (uuid) - ID инфлюенсера
      - `advertiser_id` (uuid) - ID рекламодателя
      - `influencer_card_id` (uuid) - ID карточки инфлюенсера
      - `details` (jsonb) - Детали предложения (title, description, pricing, deliverables)
      - `status` (text) - Статус: pending, accepted, rejected, expired, cancelled, withdrawn, terminated
      - `timeline` (jsonb) - Временные рамки
      - `metadata` (jsonb) - Метаданные (score, isAutomatic, rejectionReason, reactivated, unitAudienceCost)
      - `current_stage` (text) - Текущий этап
      - `initiated_by` (uuid) - Кто инициировал
      - `created_at` (timestamptz) - Дата создания
      - `updated_at` (timestamptz) - Дата обновления

  2. Безопасность
    - Включён RLS
    - Политики для инфлюенсеров (просмотр своих предложений)
    - Политики для рекламодателей (просмотр своих отправленных предложений)
    - Политики для админов (полный доступ)
    - Политики на обновление (принятие/отклонение предложения)

  3. Индексы
    - По campaign_id для быстрого поиска
    - По influencer_id для профиля инфлюенсера
    - По advertiser_id для профиля рекламодателя
    - По status для фильтрации
*/

-- Создание таблицы collaboration_offers
CREATE TABLE IF NOT EXISTS collaboration_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  advertiser_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  influencer_card_id UUID,
  
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  timeline JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  current_stage TEXT DEFAULT 'offer_sent',
  initiated_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_offers_campaign ON collaboration_offers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_offers_influencer ON collaboration_offers(influencer_id);
CREATE INDEX IF NOT EXISTS idx_offers_advertiser ON collaboration_offers(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON collaboration_offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON collaboration_offers(created_at DESC);

-- Включение RLS
ALTER TABLE collaboration_offers ENABLE ROW LEVEL SECURITY;

-- Политика: Инфлюенсеры видят свои предложения
CREATE POLICY "Influencers can view own offers"
  ON collaboration_offers FOR SELECT
  TO authenticated
  USING (auth.uid() = influencer_id);

-- Политика: Рекламодатели видят свои отправленные предложения
CREATE POLICY "Advertisers can view own offers"
  ON collaboration_offers FOR SELECT
  TO authenticated
  USING (auth.uid() = advertiser_id);

-- Политика: Админы видят все предложения
CREATE POLICY "Admins can view all offers"
  ON collaboration_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Политика: Рекламодатели могут создавать предложения
CREATE POLICY "Advertisers can create offers"
  ON collaboration_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = advertiser_id);

-- Политика: Инфлюенсеры могут обновлять статус своих предложений
CREATE POLICY "Influencers can update own offer status"
  ON collaboration_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = influencer_id)
  WITH CHECK (auth.uid() = influencer_id);

-- Политика: Рекламодатели могут обновлять свои предложения
CREATE POLICY "Advertisers can update own offers"
  ON collaboration_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = advertiser_id)
  WITH CHECK (auth.uid() = advertiser_id);

-- Политика: Админы могут обновлять все предложения
CREATE POLICY "Admins can update all offers"
  ON collaboration_offers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_collaboration_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_collaboration_offers_updated_at ON collaboration_offers;
CREATE TRIGGER trigger_update_collaboration_offers_updated_at
  BEFORE UPDATE ON collaboration_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_collaboration_offers_updated_at();
