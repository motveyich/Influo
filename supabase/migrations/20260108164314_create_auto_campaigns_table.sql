/*
  # Создание таблицы автокомпаний

  ## Описание
  Таблица для автоматических кампаний рекламодателей.
  Система автоматически подбирает инфлюенсеров и отправляет предложения.

  ## Новые таблицы

  ### auto_campaigns
  - id (uuid, primary key)
  - advertiser_id (uuid, foreign key -> user_profiles)
  - title (text) - название кампании
  - description (text) - описание/ТЗ
  - status (text) - draft, active, closed, completed
  - budget_min (numeric) - минимальный бюджет
  - budget_max (numeric) - максимальный бюджет
  - audience_min (integer) - минимальный размер аудитории
  - audience_max (integer) - максимальный размер аудитории
  - target_influencers_count (integer) - целевое количество инфлюенсеров
  - content_types (text[]) - типы контента: post, story, reel, video
  - platforms (text[]) - платформы: Instagram, YouTube, TikTok
  - start_date (timestamptz) - дата начала
  - end_date (timestamptz) - дата окончания
  - target_price_per_follower (numeric) - идеальная цена за подписчика
  - sent_offers_count (integer, default 0) - отправлено предложений
  - accepted_offers_count (integer, default 0) - принято предложений
  - completed_offers_count (integer, default 0) - завершено сотрудничеств
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ## Security
  - Enable RLS
  - Рекламодатели могут создавать и видеть только свои кампании
  - Инфлюенсеры не видят кампании напрямую (только через предложения)
*/

-- Создаем таблицу автокомпаний
CREATE TABLE IF NOT EXISTS auto_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'completed')),
  budget_min numeric NOT NULL CHECK (budget_min >= 0),
  budget_max numeric NOT NULL CHECK (budget_max >= budget_min),
  audience_min integer NOT NULL CHECK (audience_min >= 0),
  audience_max integer NOT NULL CHECK (audience_max >= audience_min),
  target_influencers_count integer NOT NULL CHECK (target_influencers_count > 0),
  content_types text[] NOT NULL DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  start_date timestamptz,
  end_date timestamptz,
  target_price_per_follower numeric,
  sent_offers_count integer NOT NULL DEFAULT 0,
  accepted_offers_count integer NOT NULL DEFAULT 0,
  completed_offers_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавляем индексы
CREATE INDEX IF NOT EXISTS idx_auto_campaigns_advertiser ON auto_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_auto_campaigns_status ON auto_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_auto_campaigns_created_at ON auto_campaigns(created_at DESC);

-- Добавляем поле auto_campaign_id в таблицу offers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'auto_campaign_id'
  ) THEN
    ALTER TABLE offers ADD COLUMN auto_campaign_id uuid REFERENCES auto_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offers_auto_campaign ON offers(auto_campaign_id);

-- Enable RLS
ALTER TABLE auto_campaigns ENABLE ROW LEVEL SECURITY;

-- Политика: рекламодатели могут читать свои кампании
CREATE POLICY "Advertisers can view own auto-campaigns"
  ON auto_campaigns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = advertiser_id);

-- Политика: рекламодатели могут создавать кампании
CREATE POLICY "Advertisers can create auto-campaigns"
  ON auto_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = advertiser_id);

-- Политика: рекламодатели могут обновлять свои кампании
CREATE POLICY "Advertisers can update own auto-campaigns"
  ON auto_campaigns
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = advertiser_id)
  WITH CHECK (auth.uid() = advertiser_id);

-- Политика: рекламодатели могут удалять свои кампании
CREATE POLICY "Advertisers can delete own auto-campaigns"
  ON auto_campaigns
  FOR DELETE
  TO authenticated
  USING (auth.uid() = advertiser_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_auto_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_campaigns_updated_at
  BEFORE UPDATE ON auto_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_campaigns_updated_at();

-- Комментарии
COMMENT ON TABLE auto_campaigns IS 'Автоматические кампании рекламодателей для подбора инфлюенсеров';
COMMENT ON COLUMN auto_campaigns.target_price_per_follower IS 'Идеальная цена за подписчика = avgAudience / avgBudget';
COMMENT ON COLUMN offers.auto_campaign_id IS 'Ссылка на автокомпанию, если предложение создано автоматически';