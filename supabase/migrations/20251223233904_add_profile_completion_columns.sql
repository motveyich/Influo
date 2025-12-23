/*
  # Add profile completion tracking columns

  1. Changes
    - Add profile_completion_basic_info boolean column
    - Add profile_completion_influencer_setup boolean column
    - Add profile_completion_advertiser_setup boolean column
    - Add profile_completion_overall_complete boolean column
    - Add profile_completion_percentage integer column
  
  2. Notes
    - All columns default to FALSE/0 for existing profiles
    - Trigger will automatically calculate these on next update
*/

-- Add profile completion columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion_basic_info'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN profile_completion_basic_info BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion_influencer_setup'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN profile_completion_influencer_setup BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion_advertiser_setup'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN profile_completion_advertiser_setup BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion_overall_complete'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN profile_completion_overall_complete BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion_percentage'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN profile_completion_percentage INTEGER DEFAULT 0;
  END IF;
END $$;