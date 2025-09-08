/*
  # Enable admin user blocking functionality

  1. Security Updates
    - Drop existing restrictive UPDATE policy on user_profiles
    - Create separate policies for regular users and admins
    - Allow admins/moderators to update deletion fields (is_deleted, deleted_at, deleted_by)
    - Prevent regular users from modifying deletion fields

  2. Policy Details
    - Regular users: Can update their own profile except deletion fields
    - Admins/Moderators: Can update any user's deletion status
    - Maintains security while enabling admin functionality
*/

-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create policy for regular users (excludes deletion fields)
CREATE POLICY "Users can update own profile data"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (
    auth.uid()::text = user_id::text AND
    -- Prevent regular users from modifying deletion fields
    (OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted) AND
    (OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at) AND
    (OLD.deleted_by IS NOT DISTINCT FROM NEW.deleted_by)
  );

-- Create policy for admins and moderators to manage user blocking
CREATE POLICY "Admins can manage user blocking"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
      AND admin_profile.role IN ('admin', 'moderator')
      AND admin_profile.is_deleted = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
      AND admin_profile.role IN ('admin', 'moderator')
      AND admin_profile.is_deleted = false
    )
  );