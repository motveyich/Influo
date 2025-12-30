/*
  # Add phone field to user profiles

  1. Changes
    - Add `phone` column to `user_profiles` table
    - Update profile completion calculation to include phone field

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone text;
  END IF;
END $$;