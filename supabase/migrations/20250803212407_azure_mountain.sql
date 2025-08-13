/*
  # Add profile data columns to user_profiles table

  1. New Columns
    - `influencer_data` (jsonb) - Stores influencer-specific profile information
    - `advertiser_data` (jsonb) - Stores advertiser-specific profile information

  2. Changes
    - Add influencer_data column with default empty JSON object
    - Add advertiser_data column with default empty JSON object
    - Both columns are nullable to allow users to have only one type of profile data
*/

-- Add influencer_data column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'influencer_data'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN influencer_data JSONB DEFAULT NULL;
  END IF;
END $$;

-- Add advertiser_data column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'advertiser_data'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN advertiser_data JSONB DEFAULT NULL;
  END IF;
END $$;