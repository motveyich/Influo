/*
  # Fix RLS policies for user blocking

  1. Policy Updates
    - Drop existing restrictive UPDATE policy on user_profiles
    - Create new policy allowing admins/moderators to update user blocking fields
    - Maintain security for regular user updates

  2. Security
    - Admins and moderators can update is_deleted, deleted_at, deleted_by fields
    - Regular users can still update their own profiles (excluding deletion fields)
    - Proper role-based access control
*/

-- Drop existing UPDATE policy that might be blocking admin actions
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create policy for regular users to update their own profiles (excluding deletion fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Prevent regular users from modifying deletion fields
    (
      OLD.is_deleted = NEW.is_deleted AND
      OLD.deleted_at = NEW.deleted_at AND
      OLD.deleted_by = NEW.deleted_by
    )
  );

-- Create policy for admins and moderators to manage user blocking
CREATE POLICY "Admins can manage user blocking"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
  );