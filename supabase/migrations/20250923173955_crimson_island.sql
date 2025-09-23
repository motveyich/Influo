/*
  # Fix RLS policy for user blocking functionality

  1. Policy Updates
    - Update existing RLS policies to allow admin/moderator users to block/unblock other users
    - Ensure admins and moderators can update the `is_deleted`, `deleted_at`, and `deleted_by` fields
    - Maintain security by preventing regular users from blocking others
    - Allow users to still update their own profiles (except deletion fields)

  2. Security
    - Only admin and moderator roles can block/unblock users
    - Users cannot block themselves through the admin interface
    - Regular users cannot modify deletion-related fields
*/

-- Drop existing restrictive policies that might be blocking admin operations
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON user_profiles;

-- Create comprehensive UPDATE policy for user profiles
CREATE POLICY "Users can update own profile data"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    (user_id = auth.uid())
    AND 
    -- But cannot modify deletion-related fields themselves
    (
      OLD.is_deleted = NEW.is_deleted AND
      OLD.deleted_at = NEW.deleted_at AND
      OLD.deleted_by = NEW.deleted_by
    )
  )
  WITH CHECK (
    -- Users can update their own profile
    (user_id = auth.uid())
    AND 
    -- But cannot modify deletion-related fields themselves
    (
      OLD.is_deleted = NEW.is_deleted AND
      OLD.deleted_at = NEW.deleted_at AND
      OLD.deleted_by = NEW.deleted_by
    )
  );

-- Create policy for admin/moderator user management
CREATE POLICY "Admins and moderators can manage users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Check if the current user has admin or moderator role
    EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
        AND up.role IN ('admin', 'moderator')
        AND up.is_deleted = false
    )
    -- Prevent self-blocking through admin interface
    AND user_id != auth.uid()
  )
  WITH CHECK (
    -- Check if the current user has admin or moderator role
    EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
        AND up.role IN ('admin', 'moderator')
        AND up.is_deleted = false
    )
    -- Prevent self-blocking through admin interface
    AND user_id != auth.uid()
  );

-- Create policy for admins to update their own profiles (including role changes)
CREATE POLICY "Admins can update own profile including role"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
        AND up.role = 'admin'
        AND up.is_deleted = false
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
        AND up.role = 'admin'
        AND up.is_deleted = false
    )
  );

-- Ensure service role can perform any operations (for system operations)
CREATE POLICY "Service role can manage all users"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);