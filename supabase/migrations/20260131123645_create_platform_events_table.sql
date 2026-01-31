/*
  # Create platform_events table for content management

  1. New Tables
    - `platform_events`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, required)
      - `event_type` (enum: webinar, workshop, conference, meetup, other)
      - `start_date` (timestamptz, required)
      - `end_date` (timestamptz, optional)
      - `location` (text, optional, physical or virtual location)
      - `registration_link` (text, optional, link to register)
      - `participant_count` (integer, default 0)
      - `max_participants` (integer, optional)
      - `is_published` (boolean, default false)
      - `published_at` (timestamptz, nullable)
      - `created_by` (uuid, foreign key to user_profiles.user_id)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)
      - `metadata` (jsonb, optional additional data)
      
  2. Security
    - Enable RLS on `platform_events` table
    - Add policy for public read access to published events
    - Add policy for admin/moderator full access
    - Add policy for creators to manage their own events
*/

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM ('webinar', 'workshop', 'conference', 'meetup', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  event_type event_type NOT NULL DEFAULT 'other',
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  registration_link text,
  participant_count integer DEFAULT 0,
  max_participants integer,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_platform_events_published ON platform_events(is_published, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_type ON platform_events(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_events_start_date ON platform_events(start_date);
CREATE INDEX IF NOT EXISTS idx_platform_events_created_by ON platform_events(created_by);

ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published events"
  ON platform_events FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all events"
  ON platform_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can create events"
  ON platform_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update all events"
  ON platform_events FOR UPDATE
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

CREATE POLICY "Creators can update own unpublished events"
  ON platform_events FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    AND is_published = false
  )
  WITH CHECK (
    created_by = auth.uid()
    AND is_published = false
  );

CREATE POLICY "Admins can delete events"
  ON platform_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE OR REPLACE FUNCTION update_platform_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_events_updated_at ON platform_events;

CREATE TRIGGER platform_events_updated_at
  BEFORE UPDATE ON platform_events
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_events_updated_at();