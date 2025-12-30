/*
  # Создание таблиц для избранного и аналитики карточек

  1. Новые таблицы
    - `favorites` - избранные карточки пользователей
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `target_type` (text, тип цели: influencer_card, advertiser_card)
      - `target_id` (uuid, ID карточки)
      - `metadata` (jsonb, дополнительные данные)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `applications` - заявки на сотрудничество
      - `id` (uuid, primary key)
      - `applicant_id` (uuid, foreign key to user_profiles)
      - `target_id` (uuid, foreign key to user_profiles)
      - `target_type` (text, тип цели)
      - `target_reference_id` (uuid, ID карточки/кампании)
      - `application_data` (jsonb, данные заявки)
      - `status` (text, статус заявки)
      - `response_data` (jsonb, данные ответа)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `card_analytics` - аналитика карточек
      - `id` (uuid, primary key)
      - `card_type` (text, тип карточки)
      - `card_id` (uuid, ID карточки)
      - `owner_id` (uuid, владелец карточки)
      - `metrics` (jsonb, метрики)
      - `daily_stats` (jsonb, ежедневная статистика)
      - `campaign_stats` (jsonb, статистика кампаний)
      - `engagement_data` (jsonb, данные вовлеченности)
      - `date_recorded` (date, дата записи)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `application_analytics` - аналитика заявок
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key to applications)
      - `metrics` (jsonb, метрики заявки)
      - `timeline_events` (jsonb, события временной шкалы)
      - `performance_data` (jsonb, данные производительности)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для всех таблиц
    - Добавить политики для чтения и записи собственных данных
    - Ограничить доступ к данным других пользователей

  3. Индексы
    - Добавить индексы для оптимизации запросов
    - Индексы по пользователям, типам, статусам и датам
*/

-- Создание таблицы избранного
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('influencer_card', 'advertiser_card', 'campaign')),
  target_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- Создание таблицы заявок
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('influencer_card', 'advertiser_card', 'campaign')),
  target_reference_id uuid NOT NULL,
  application_data jsonb DEFAULT '{}',
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  response_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы аналитики карточек
CREATE TABLE IF NOT EXISTS card_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type text NOT NULL CHECK (card_type IN ('influencer', 'advertiser')),
  card_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  metrics jsonb DEFAULT '{"totalViews": 0, "uniqueViews": 0, "applications": 0, "acceptanceRate": 0, "averageResponseTime": 0, "rating": 0, "completedProjects": 0}',
  daily_stats jsonb DEFAULT '{}',
  campaign_stats jsonb DEFAULT '[]',
  engagement_data jsonb DEFAULT '{"clickThroughRate": 0, "messageRate": 0, "favoriteRate": 0}',
  date_recorded date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(card_type, card_id, date_recorded)
);

-- Создание таблицы аналитики заявок
CREATE TABLE IF NOT EXISTS application_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  metrics jsonb DEFAULT '{"responseTime": 0, "viewCount": 0, "engagementScore": 0}',
  timeline_events jsonb DEFAULT '[]',
  performance_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_analytics ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы favorites
CREATE POLICY "Users can manage own favorites"
  ON favorites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Политики для таблицы applications
CREATE POLICY "Users can read own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (applicant_id = auth.uid() OR target_id = auth.uid());

CREATE POLICY "Users can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Users can update received applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (target_id = auth.uid());

-- Политики для таблицы card_analytics
CREATE POLICY "Users can read own card analytics"
  ON card_analytics
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can manage own card analytics"
  ON card_analytics
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Политики для таблицы application_analytics
CREATE POLICY "Users can read application analytics"
  ON application_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_analytics.application_id 
      AND (applications.applicant_id = auth.uid() OR applications.target_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage application analytics"
  ON application_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_analytics.application_id 
      AND (applications.applicant_id = auth.uid() OR applications.target_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_analytics.application_id 
      AND (applications.applicant_id = auth.uid() OR applications.target_id = auth.uid())
    )
  );

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_target ON favorites(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_target_id ON applications(target_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_card_analytics_card ON card_analytics(card_type, card_id);
CREATE INDEX IF NOT EXISTS idx_card_analytics_owner_id ON card_analytics(owner_id);
CREATE INDEX IF NOT EXISTS idx_card_analytics_date ON card_analytics(date_recorded DESC);

CREATE INDEX IF NOT EXISTS idx_application_analytics_application_id ON application_analytics(application_id);

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_favorites_updated_at
  BEFORE UPDATE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_analytics_updated_at
  BEFORE UPDATE ON card_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_analytics_updated_at
  BEFORE UPDATE ON application_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();