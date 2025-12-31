/*
  # Add soft delete fields to user_profiles

  1. Changes
    - Add `is_deleted` boolean column (default: false)
    - Add `deleted_at` timestamp column (nullable)
    - Add `deleted_by` UUID column referencing user_profiles(user_id)
  
  2. Purpose
    - Enable soft deletion of user profiles
    - Track when and by whom a profile was deleted
    - Maintain data integrity for historical records
  
  3. Security
    - These fields are managed by backend only
    - Users cannot modify their own deletion status
*/

-- Add soft delete columns to user_profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_deleted boolean DEFAULT false NOT NULL;
    ALTER TABLE user_profiles ADD COLUMN deleted_at timestamptz;
    ALTER TABLE user_profiles ADD COLUMN deleted_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL;
    
    -- Create index for faster queries filtering out deleted profiles
    CREATE INDEX IF NOT EXISTS idx_user_profiles_not_deleted ON user_profiles(user_id) WHERE is_deleted = false;
  END IF;
END $$;
