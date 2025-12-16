/*
  # Create Platform Updates and Events Tables
  
  1. New Tables
    - `platform_updates`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `content` (text)
      - `type` (text) - feature, bugfix, improvement, announcement
      - `is_important` (boolean, default false)
      - `published_at` (timestamptz)
      - `is_published` (boolean, default true)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `platform_events`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `content` (text)
      - `type` (text) - announcement, contest, promotion, webinar
      - `participant_count` (integer, default 0)
      - `published_at` (timestamptz)
      - `is_published` (boolean, default true)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Public read access for published content
    - Moderators/Admins can create, update, delete
*/

-- Create platform_updates table
CREATE TABLE IF NOT EXISTS platform_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  type text DEFAULT 'feature' CHECK (type IN ('feature', 'bugfix', 'improvement', 'announcement')),
  is_important boolean DEFAULT false,
  published_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform_events table
CREATE TABLE IF NOT EXISTS platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  type text DEFAULT 'announcement' CHECK (type IN ('announcement', 'contest', 'promotion', 'webinar')),
  participant_count integer DEFAULT 0,
  published_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;

-- Policies for platform_updates
CREATE POLICY "Anyone can view published updates"
  ON platform_updates
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Moderators can view all updates"
  ON platform_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can create updates"
  ON platform_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can update updates"
  ON platform_updates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete updates"
  ON platform_updates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policies for platform_events
CREATE POLICY "Anyone can view published events"
  ON platform_events
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Moderators can view all events"
  ON platform_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can create events"
  ON platform_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can update events"
  ON platform_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete events"
  ON platform_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_updates_published ON platform_updates(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_published ON platform_events(is_published, published_at DESC);
