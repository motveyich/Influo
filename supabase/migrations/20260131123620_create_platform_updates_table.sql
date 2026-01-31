/*
  # Create platform_updates table for content management

  1. New Tables
    - `platform_updates`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `content` (text, required)
      - `summary` (text, optional, short summary for listing)
      - `type` (enum: info, warning, success, error)
      - `priority` (enum: low, medium, high, critical)
      - `is_published` (boolean, default false)
      - `is_important` (boolean, default false, for pinned updates)
      - `url` (text, optional, external link)
      - `source` (text, optional, source platform)
      - `published_at` (timestamptz, nullable)
      - `created_by` (uuid, foreign key to user_profiles.user_id)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)
      - `metadata` (jsonb, optional additional data)
      
  2. Security
    - Enable RLS on `platform_updates` table
    - Add policy for public read access to published updates
    - Add policy for admin/moderator full access
    - Add policy for creators to manage their own updates
*/

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'update_type') THEN
    CREATE TYPE update_type AS ENUM ('info', 'warning', 'success', 'error');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'update_priority') THEN
    CREATE TYPE update_priority AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS platform_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  type update_type NOT NULL DEFAULT 'info',
  priority update_priority NOT NULL DEFAULT 'medium',
  is_published boolean DEFAULT false,
  is_important boolean DEFAULT false,
  url text,
  source text,
  published_at timestamptz,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_platform_updates_published ON platform_updates(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_updates_type ON platform_updates(type);
CREATE INDEX IF NOT EXISTS idx_platform_updates_priority ON platform_updates(priority);
CREATE INDEX IF NOT EXISTS idx_platform_updates_created_by ON platform_updates(created_by);

ALTER TABLE platform_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published updates"
  ON platform_updates FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all updates"
  ON platform_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can create updates"
  ON platform_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update all updates"
  ON platform_updates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Creators can update own unpublished updates"
  ON platform_updates FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    AND is_published = false
  )
  WITH CHECK (
    created_by = auth.uid()
    AND is_published = false
  );

CREATE POLICY "Admins can delete updates"
  ON platform_updates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE OR REPLACE FUNCTION update_platform_updates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_updates_updated_at ON platform_updates;

CREATE TRIGGER platform_updates_updated_at
  BEFORE UPDATE ON platform_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updates_updated_at();