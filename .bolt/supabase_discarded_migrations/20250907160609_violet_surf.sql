/*
  # Добавить управление контентом для администраторов

  1. Новые таблицы
    - `platform_news` - новости индустрии
    - `platform_updates` - обновления платформы  
    - `platform_events` - события платформы

  2. Безопасность
    - Включить RLS для всех таблиц
    - Добавить политики для модераторов и администраторов
    - Добавить политики для чтения всем пользователям

  3. Функции
    - Функция обновления updated_at
*/

-- Создание таблицы новостей индустрии
CREATE TABLE IF NOT EXISTS platform_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  content text,
  url text,
  source text NOT NULL,
  category text NOT NULL DEFAULT 'industry',
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы обновлений платформы
CREATE TABLE IF NOT EXISTS platform_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  content text,
  type text NOT NULL DEFAULT 'feature',
  is_important boolean DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы событий платформы
CREATE TABLE IF NOT EXISTS platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  content text,
  type text NOT NULL DEFAULT 'announcement',
  participant_count integer DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавление ограничений
ALTER TABLE platform_news ADD CONSTRAINT platform_news_category_check 
  CHECK (category IN ('industry', 'platform', 'trends'));

ALTER TABLE platform_updates ADD CONSTRAINT platform_updates_type_check 
  CHECK (type IN ('feature', 'improvement', 'announcement', 'maintenance'));

ALTER TABLE platform_events ADD CONSTRAINT platform_events_type_check 
  CHECK (type IN ('campaign_launch', 'achievement', 'contest', 'milestone', 'announcement', 'maintenance'));

-- Включение RLS
ALTER TABLE platform_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;

-- Политики для чтения (все аутентифицированные пользователи)
CREATE POLICY "Anyone can read published news"
  ON platform_news
  FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Anyone can read published updates"
  ON platform_updates
  FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Anyone can read published events"
  ON platform_events
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Политики для модераторов и администраторов (полный доступ)
CREATE POLICY "Moderators can manage news"
  ON platform_news
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Moderators can manage updates"
  ON platform_updates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Moderators can manage events"
  ON platform_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('moderator', 'admin')
    )
  );

-- Триггеры для обновления updated_at
CREATE TRIGGER update_platform_news_updated_at
  BEFORE UPDATE ON platform_news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_updates_updated_at
  BEFORE UPDATE ON platform_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_events_updated_at
  BEFORE UPDATE ON platform_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_platform_news_published ON platform_news (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_news_category ON platform_news (category);
CREATE INDEX IF NOT EXISTS idx_platform_updates_published ON platform_updates (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_updates_type ON platform_updates (type);
CREATE INDEX IF NOT EXISTS idx_platform_events_published ON platform_events (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_type ON platform_events (type);