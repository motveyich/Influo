/*
  # Create Platform Content Tables

  1. New Tables
    - `platform_news`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `summary` (text, required)
      - `content` (text, optional)
      - `url` (text, optional)
      - `source` (text, required)
      - `category` (text, required) - industry, platform, trends
      - `published_at` (timestamptz, required)
      - `is_published` (boolean, default true)
      - `created_by` (uuid, optional, references user_profiles)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

    - `platform_updates`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, required)
      - `content` (text, optional)
      - `type` (text, required) - feature, improvement, announcement
      - `is_important` (boolean, default false)
      - `published_at` (timestamptz, required)
      - `is_published` (boolean, default true)
      - `created_by` (uuid, optional, references user_profiles)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

    - `platform_events`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, required)
      - `content` (text, optional)
      - `type` (text, required) - campaign_launch, achievement, contest, milestone, announcement
      - `participant_count` (integer, default 0)
      - `published_at` (timestamptz, required)
      - `is_published` (boolean, default true)
      - `created_by` (uuid, optional, references user_profiles)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read published content
    - Add policies for moderators/admins to manage content

  3. Indexes
    - Add indexes for performance on commonly queried columns
*/

-- Create platform_news table
CREATE TABLE IF NOT EXISTS platform_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  content text,
  url text,
  source text NOT NULL,
  category text NOT NULL CHECK (category IN ('industry', 'platform', 'trends')),
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform_updates table
CREATE TABLE IF NOT EXISTS platform_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  content text,
  type text NOT NULL CHECK (type IN ('feature', 'improvement', 'announcement')),
  is_important boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform_events table
CREATE TABLE IF NOT EXISTS platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  content text,
  type text NOT NULL CHECK (type IN ('campaign_launch', 'achievement', 'contest', 'milestone', 'announcement')),
  participant_count integer DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE platform_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;

-- Create policies for platform_news
--CREATE POLICY "Anyone can read published news"
  --ON platform_news
  --FOR SELECT
  --TO authenticated
  --USING (is_published = true);

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

-- Create policies for platform_updates
CREATE POLICY "Anyone can read published updates"
  ON platform_updates
  FOR SELECT
  TO authenticated
  USING (is_published = true);

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

-- Create policies for platform_events
CREATE POLICY "Anyone can read published events"
  ON platform_events
  FOR SELECT
  TO authenticated
  USING (is_published = true);

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_news_published_at ON platform_news (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_news_category ON platform_news (category);
CREATE INDEX IF NOT EXISTS idx_platform_news_is_published ON platform_news (is_published);
CREATE INDEX IF NOT EXISTS idx_platform_news_created_by ON platform_news (created_by);

CREATE INDEX IF NOT EXISTS idx_platform_updates_published_at ON platform_updates (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_updates_type ON platform_updates (type);
CREATE INDEX IF NOT EXISTS idx_platform_updates_is_published ON platform_updates (is_published);
CREATE INDEX IF NOT EXISTS idx_platform_updates_is_important ON platform_updates (is_important);
CREATE INDEX IF NOT EXISTS idx_platform_updates_created_by ON platform_updates (created_by);

CREATE INDEX IF NOT EXISTS idx_platform_events_published_at ON platform_events (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_type ON platform_events (type);
CREATE INDEX IF NOT EXISTS idx_platform_events_is_published ON platform_events (is_published);
CREATE INDEX IF NOT EXISTS idx_platform_events_created_by ON platform_events (created_by);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_platform_news_updated_at') THEN
        CREATE TRIGGER update_platform_news_updated_at
            BEFORE UPDATE ON platform_news
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_platform_updates_updated_at') THEN
        CREATE TRIGGER update_platform_updates_updated_at
            BEFORE UPDATE ON platform_updates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_platform_events_updated_at') THEN
        CREATE TRIGGER update_platform_events_updated_at
            BEFORE UPDATE ON platform_events
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;