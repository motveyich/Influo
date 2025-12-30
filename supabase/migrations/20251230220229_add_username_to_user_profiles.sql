/*
  # Add username field to user_profiles table

  1. New Columns
    - `username` (text, nullable) - User's display name/nickname

  2. Security
    - No changes to existing RLS policies
    - Username field is optional and can be null

  3. Notes
    - Added index for performance on username lookups
    - Username can be different from full_name
    - Field is nullable to maintain backward compatibility
*/

-- Add username column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username text;
  END IF;
END $$;

-- Add index for username field for better performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_profiles' AND indexname = 'idx_user_profiles_username'
  ) THEN
    CREATE INDEX idx_user_profiles_username ON user_profiles(username);
  END IF;
END $$;