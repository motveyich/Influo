/*
  # Система ролей и модерации

  1. Новые таблицы
    - `user_roles` - роли пользователей (user, moderator, admin)
    - `content_reports` - жалобы на контент
    - `moderation_queue` - очередь модерации
    - `admin_logs` - логи действий администраторов
    - `content_filters` - настройки фильтров контента

  2. Безопасность
    - RLS политики для всех таблиц
    - Ограничения доступа по ролям
    - Логирование всех действий

  3. Индексы
    - Оптимизация запросов по ролям
    - Индексы для фильтрации и поиска
*/

-- Создание enum для ролей
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Создание enum для статусов модерации
DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Создание enum для типов жалоб
DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('spam', 'inappropriate', 'fake', 'harassment', 'copyright', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Таблица ролей пользователей
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  assigned_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица жалоб на контент
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('user_profile', 'influencer_card', 'campaign', 'chat_message', 'offer')),
  target_id uuid NOT NULL,
  report_type report_type NOT NULL,
  description text NOT NULL,
  evidence jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_notes text,
  priority integer DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица очереди модерации
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('user_profile', 'influencer_card', 'campaign', 'chat_message', 'offer')),
  content_id uuid NOT NULL,
  content_data jsonb NOT NULL,
  moderation_status moderation_status DEFAULT 'pending',
  flagged_reasons text[],
  auto_flagged boolean DEFAULT false,
  filter_matches jsonb DEFAULT '{}',
  assigned_moderator uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  priority integer DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица логов администраторов
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Таблица настроек фильтров контента
CREATE TABLE IF NOT EXISTS content_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_name text NOT NULL UNIQUE,
  filter_type text NOT NULL CHECK (filter_type IN ('profanity', 'contact_info', 'spam', 'custom')),
  pattern text NOT NULL,
  is_regex boolean DEFAULT true,
  is_active boolean DEFAULT true,
  severity integer DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  action text DEFAULT 'flag' CHECK (action IN ('flag', 'block', 'review')),
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавление поля роли в user_profiles (если не существует)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role user_role DEFAULT 'user';
  END IF;
END $$;

-- Добавление полей модерации в существующие таблицы
DO $$
BEGIN
  -- Добавляем поля модерации в influencer_cards
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'influencer_cards' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE influencer_cards ADD COLUMN moderation_status moderation_status DEFAULT 'approved';
    ALTER TABLE influencer_cards ADD COLUMN is_deleted boolean DEFAULT false;
    ALTER TABLE influencer_cards ADD COLUMN deleted_at timestamptz;
    ALTER TABLE influencer_cards ADD COLUMN deleted_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL;
  END IF;

  -- Добавляем поля модерации в campaigns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN moderation_status moderation_status DEFAULT 'approved';
    ALTER TABLE campaigns ADD COLUMN is_deleted boolean DEFAULT false;
    ALTER TABLE campaigns ADD COLUMN deleted_at timestamptz;
    ALTER TABLE campaigns ADD COLUMN deleted_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL;
  END IF;

  -- Добавляем поля модерации в user_profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_deleted boolean DEFAULT false;
    ALTER TABLE user_profiles ADD COLUMN deleted_at timestamptz;
    ALTER TABLE user_profiles ADD COLUMN deleted_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_priority ON content_reports(priority DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(moderation_status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON moderation_queue(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON moderation_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON moderation_queue(assigned_moderator);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_filters_active ON content_filters(is_active);
CREATE INDEX IF NOT EXISTS idx_content_filters_type ON content_filters(filter_type);

-- Индексы для soft delete
CREATE INDEX IF NOT EXISTS idx_user_profiles_not_deleted ON user_profiles(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_influencer_cards_not_deleted ON influencer_cards(id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_campaigns_not_deleted ON campaigns(campaign_id) WHERE is_deleted = false;

-- RLS политики для user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS политики для content_reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read own reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Moderators can read all reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Moderators can update reports"
  ON content_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- RLS политики для moderation_queue
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage moderation queue"
  ON moderation_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- RLS политики для admin_logs
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert logs"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS политики для content_filters
ALTER TABLE content_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage content filters"
  ON content_filters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- Функция для получения роли пользователя
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT COALESCE(ur.role, up.role, 'user'::user_role)
    FROM user_profiles up
    LEFT JOIN user_roles ur ON ur.user_id = up.user_id AND ur.is_active = true
    WHERE up.user_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для проверки прав доступа
CREATE OR REPLACE FUNCTION check_user_permission(user_uuid uuid, required_role user_role)
RETURNS boolean AS $$
BEGIN
  RETURN (
    CASE required_role
      WHEN 'user' THEN true
      WHEN 'moderator' THEN get_user_role(user_uuid) IN ('moderator', 'admin')
      WHEN 'admin' THEN get_user_role(user_uuid) = 'admin'
      ELSE false
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для логирования действий администратора
CREATE OR REPLACE FUNCTION log_admin_action(
  admin_uuid uuid,
  action_type_param text,
  target_type_param text DEFAULT NULL,
  target_id_param uuid DEFAULT NULL,
  details_param jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, details)
  VALUES (admin_uuid, action_type_param, target_type_param, target_id_param, details_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для soft delete
CREATE OR REPLACE FUNCTION soft_delete_content(
  content_table text,
  content_id_param uuid,
  deleted_by_param uuid
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET is_deleted = true, deleted_at = now(), deleted_by = $1 WHERE %s = $2',
    content_table,
    CASE content_table
      WHEN 'user_profiles' THEN 'user_id'
      WHEN 'campaigns' THEN 'campaign_id'
      ELSE 'id'
    END
  ) USING deleted_by_param, content_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Вставка базовых фильтров контента
INSERT INTO content_filters (filter_name, filter_type, pattern, severity, action) VALUES
  ('profanity_basic', 'profanity', '(?i)(блядь|сука|пизда|хуй|ебать|говно)', 3, 'flag'),
  ('contact_phone', 'contact_info', '(?i)(\+?[0-9\s\-\(\)]{10,}|телефон|phone|тел\.)', 2, 'review'),
  ('contact_email', 'contact_info', '(?i)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', 2, 'review'),
  ('contact_social', 'contact_info', '(?i)(instagram\.com|youtube\.com|tiktok\.com|vk\.com|telegram)', 2, 'review'),
  ('spam_keywords', 'spam', '(?i)(заработок|быстрые деньги|без вложений|гарантия|100%)', 2, 'flag')
ON CONFLICT (filter_name) DO NOTHING;

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_reports_updated_at
  BEFORE UPDATE ON content_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moderation_queue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_filters_updated_at
  BEFORE UPDATE ON content_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание первого администратора (будет обновлено при первом входе)
INSERT INTO user_roles (user_id, role, assigned_by, metadata)
SELECT 
  user_id, 
  'admin'::user_role, 
  user_id,
  '{"initial_admin": true}'::jsonb
FROM user_profiles 
WHERE email LIKE '%@%' 
LIMIT 1
ON CONFLICT DO NOTHING;