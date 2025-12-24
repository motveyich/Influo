/*
  # Add timeline and metadata columns to applications table

  1. Changes
    - Add timeline JSONB column to store application timeline data
    - Add metadata JSONB column to store application metadata
    - Set default values for existing records

  2. Notes
    - timeline stores: pendingAt, respondedAt, completedAt
    - metadata stores: viewCount, lastViewed
    - Both fields are JSONB for flexibility
*/

-- Add timeline column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'timeline'
  ) THEN
    ALTER TABLE applications
    ADD COLUMN timeline JSONB DEFAULT '{"pendingAt": ""}';

    -- Update existing records with current created_at as pendingAt
    UPDATE applications
    SET timeline = jsonb_build_object('pendingAt', created_at::text)
    WHERE timeline IS NULL OR timeline = '{"pendingAt": ""}'::jsonb;
  END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE applications
    ADD COLUMN metadata JSONB DEFAULT '{"viewCount": 0}';
  END IF;
END $$;

-- Ensure all existing records have proper default values
UPDATE applications
SET timeline = jsonb_build_object('pendingAt', created_at::text)
WHERE timeline IS NULL
   OR timeline = '{}'::jsonb
   OR timeline = '{"pendingAt": ""}'::jsonb;

UPDATE applications
SET metadata = '{"viewCount": 0}'::jsonb
WHERE metadata IS NULL
   OR metadata = '{}'::jsonb;
