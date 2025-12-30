/*
  # Add timeline column to applications table

  1. Changes
    - Add `timeline` column to `applications` table
    - Set type as `jsonb` with default empty object
    - Use safe column addition with existence check

  2. Security
    - No changes to existing RLS policies
    - Column inherits existing table permissions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'timeline'
  ) THEN
    ALTER TABLE applications ADD COLUMN timeline jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;