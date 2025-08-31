/*
  # Fix missing database tables and columns

  1. Database Schema Fixes
    - Add missing `role` column to `user_profiles` table
    - Create missing `content_filters` table
    - Create missing `user_roles` table
    - Create missing `content_reports` table
    - Create missing `moderation_queue` table
    - Create missing `admin_logs` table

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each role level
    - Create indexes for performance optimization

  3. Functions
    - Add trigger function for updating timestamps
    - Add function for updating influencer cards last_updated
*/

-- Add missing role column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role user_role DEFAULT 'user'::user_role;
  END IF;
END $$;

-- Create content_filters table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_name text UNIQUE NOT NULL,
  filter_type text NOT NULL CHECK (filter_type = ANY (ARRAY['profanity'::text, 'contact_info'::text, 'spam'::text, 'custom'::text])),
  pattern text NOT NULL,
  is_regex boolean DEFAULT true,
  is_active boolean DEFAULT true,
  severity integer DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
  action text DEFAULT 'flag'::text CHECK (action = ANY (ARRAY['flag'::text, 'block'::text, 'review'::text])),
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user'::user_role,
  assigned_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create content_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['user_profile'::text, 'influencer_card'::text, 'campaign'::text, 'chat_message'::text, 'offer'::text])),
  target_id uuid NOT NULL,
  report_type report_type NOT NULL,
  description text NOT NULL,
  evidence jsonb DEFAULT '{}',
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'investigating'::text, 'resolved'::text, 'dismissed'::text])),
  reviewed_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_notes text,
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create moderation_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type = ANY (ARRAY['user_profile'::text, 'influencer_card'::text, 'campaign'::text, 'chat_message'::text, 'offer'::text])),
  content_id uuid NOT NULL,
  content_data jsonb NOT NULL,
  moderation_status moderation_status DEFAULT 'pending'::moderation_status,
  flagged_reasons text[],
  auto_flagged boolean DEFAULT false,
  filter_matches jsonb DEFAULT '{}',
  assigned_moderator uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_logs table if it doesn't exist
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

-- Create trigger function for updating timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger function for updating influencer cards last_updated if it doesn't exist
CREATE OR REPLACE FUNCTION update_influencer_cards_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Enable RLS on all tables
ALTER TABLE content_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_filters
CREATE POLICY "Moderators can manage content filters"
  ON content_filters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = uid()
      AND user_profiles.role = ANY (ARRAY['moderator'::user_role, 'admin'::user_role])
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY "Admins can manage all roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = uid()
      AND user_profiles.role = 'admin'::user_role
    )
  );

-- RLS Policies for content_reports
CREATE POLICY "Users can create reports"
  ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = uid());

CREATE POLICY "Users can read own reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = uid());

CREATE POLICY "Moderators can read all reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = uid()
      AND user_profiles.role = ANY (ARRAY['moderator'::user_role, 'admin'::user_role])
    )
  );

CREATE POLICY "Moderators can update reports"
  ON content_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = uid()
      AND user_profiles.role = ANY (ARRAY['moderator'::user_role, 'admin'::user_role])
    )
  );

-- RLS Policies for moderation_queue
CREATE POLICY "Moderators can manage moderation queue"
  ON moderation_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = uid()
      AND user_profiles.role = ANY (ARRAY['moderator'::user_role, 'admin'::user_role])
    )
  );

-- RLS Policies for admin_logs
CREATE POLICY "Admins can read all logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = uid()
      AND user_profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "System can insert logs"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_filters_active ON content_filters (is_active);
CREATE INDEX IF NOT EXISTS idx_content_filters_type ON content_filters (filter_type);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles (is_active);

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status);
CREATE INDEX IF NOT EXISTS idx_content_reports_priority ON content_reports (priority DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue (moderation_status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON moderation_queue (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON moderation_queue (assigned_moderator);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON moderation_queue (priority DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs (created_at DESC);

-- Create triggers for updating timestamps
CREATE TRIGGER IF NOT EXISTS update_content_filters_updated_at
  BEFORE UPDATE ON content_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_content_reports_updated_at
  BEFORE UPDATE ON content_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_moderation_queue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default content filters
INSERT INTO content_filters (filter_name, filter_type, pattern, is_regex, severity, action) VALUES
  ('Profanity Filter', 'profanity', '(блядь|сука|пизда|хуй|ебать|говно)', true, 3, 'flag'),
  ('Contact Info Filter', 'contact_info', '(\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', true, 2, 'review'),
  ('Spam Keywords', 'spam', '(заработок|быстрые деньги|гарантия|100%|бесплатно|акция|скидка)', true, 1, 'flag')
ON CONFLICT (filter_name) DO NOTHING;