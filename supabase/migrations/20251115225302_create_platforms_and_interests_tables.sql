/*
  # Create Platforms and Interests Reference Tables

  ## New Tables
  
  ### `platforms`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Platform name (Instagram, YouTube, TikTok, etc.)
  - `display_name` (text) - Display name for UI
  - `is_active` (boolean) - Whether platform is active
  - `icon` (text) - Icon identifier
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `interests`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Interest name
  - `category` (text) - Interest category
  - `is_active` (boolean) - Whether interest is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on both tables
  - Public read access for active items
  - Admin-only write access
*/

-- Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Policies for platforms
CREATE POLICY "Anyone can view active platforms"
  ON platforms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage platforms"
  ON platforms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- Policies for interests
CREATE POLICY "Anyone can view active interests"
  ON interests FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage interests"
  ON interests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- Insert default platforms
INSERT INTO platforms (name, display_name, icon) VALUES
  ('instagram', 'Instagram', 'instagram'),
  ('youtube', 'YouTube', 'youtube'),
  ('tiktok', 'TikTok', 'music'),
  ('telegram', 'Telegram', 'send'),
  ('vk', 'ВКонтакте', 'users')
ON CONFLICT (name) DO NOTHING;

-- Insert default interests
INSERT INTO interests (name, category) VALUES
  ('Мода и стиль', 'lifestyle'),
  ('Красота и косметика', 'lifestyle'),
  ('Здоровье и фитнес', 'health'),
  ('Путешествия', 'travel'),
  ('Еда и кулинария', 'food'),
  ('Технологии', 'tech'),
  ('Игры', 'gaming'),
  ('Музыка', 'entertainment'),
  ('Кино и сериалы', 'entertainment'),
  ('Спорт', 'sport'),
  ('Образование', 'education'),
  ('Бизнес', 'business'),
  ('Автомобили', 'automotive'),
  ('Недвижимость', 'realestate'),
  ('Семья и дети', 'family'),
  ('Животные', 'pets'),
  ('Искусство', 'art'),
  ('Фотография', 'photography'),
  ('Финансы', 'finance'),
  ('Психология', 'psychology')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_platforms_active ON platforms(is_active);
CREATE INDEX IF NOT EXISTS idx_interests_active ON interests(is_active);
CREATE INDEX IF NOT EXISTS idx_interests_category ON interests(category);
