/*
  # Создание системы сделок и отзывов

  1. Новые таблицы
    - `deals` - сделки между пользователями с системой оплаты
    - `reviews` - отзывы и оценки после завершения сделок
    - `payment_confirmations` - подтверждения оплат

  2. Функции
    - Отслеживание статуса сделок
    - Система подтверждения оплат
    - Отзывы и рейтинги

  3. Безопасность
    - RLS политики для защиты данных
    - Политики для участников сделок
*/

-- Создание enum типов
DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('full_prepay', 'partial_prepay_postpay', 'postpay');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('created', 'payment_configured', 'prepay_pending', 'prepay_confirmed', 'work_in_progress', 'work_completed', 'postpay_pending', 'postpay_confirmed', 'completed', 'cancelled', 'disputed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Таблица сделок
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers(offer_id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_type payment_type NOT NULL DEFAULT 'full_prepay',
  prepay_amount numeric(10,2) DEFAULT 0,
  postpay_amount numeric(10,2) DEFAULT 0,
  payment_details jsonb DEFAULT '{}',
  deal_status deal_status NOT NULL DEFAULT 'created',
  prepay_confirmed_by_payer boolean DEFAULT false,
  prepay_confirmed_by_payee boolean DEFAULT false,
  postpay_confirmed_by_payer boolean DEFAULT false,
  postpay_confirmed_by_payee boolean DEFAULT false,
  work_details jsonb DEFAULT '{}',
  deliverables_confirmed boolean DEFAULT false,
  completion_confirmed_by_both boolean DEFAULT false,
  dispute_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  comment text NOT NULL,
  collaboration_type text NOT NULL,
  is_public boolean DEFAULT true,
  helpful_votes integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица подтверждений оплаты
CREATE TABLE IF NOT EXISTS payment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  payment_stage text NOT NULL,
  confirmed_by uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  confirmation_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  confirmation_details jsonb DEFAULT '{}',
  confirmed_at timestamptz DEFAULT now()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_deals_payer_id ON deals(payer_id);
CREATE INDEX IF NOT EXISTS idx_deals_payee_id ON deals(payee_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(deal_status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_deal_id ON reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

CREATE INDEX IF NOT EXISTS idx_payment_confirmations_deal_id ON payment_confirmations(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_confirmed_by ON payment_confirmations(confirmed_by);

-- RLS политики для deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deals"
  ON deals
  FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Users can update own deals"
  ON deals
  FOR UPDATE
  TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid())
  WITH CHECK (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Users can create deals"
  ON deals
  FOR INSERT
  TO authenticated
  WITH CHECK (payer_id = auth.uid() OR payee_id = auth.uid());

-- RLS политики для reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read public reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (is_public = true OR reviewer_id = auth.uid() OR reviewee_id = auth.uid());

CREATE POLICY "Users can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- RLS политики для payment_confirmations
ALTER TABLE payment_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read payment confirmations for own deals"
  ON payment_confirmations
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM deals 
    WHERE deals.id = payment_confirmations.deal_id 
    AND (deals.payer_id = auth.uid() OR deals.payee_id = auth.uid())
  ));

CREATE POLICY "Users can create payment confirmations"
  ON payment_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (confirmed_by = auth.uid());

-- Триггеры для updated_at
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deals_updated_at_trigger
  BEFORE UPDATE ON deals 
  FOR EACH ROW EXECUTE FUNCTION update_deals_updated_at();

CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at_trigger
  BEFORE UPDATE ON reviews 
  FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();