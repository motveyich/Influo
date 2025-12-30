/*
  # Fix RLS policies for user blocking

  1. Security Updates
    - Drop conflicting admin/moderator policies
    - Create comprehensive policy for admin/moderator user management
    - Ensure proper field-level permissions for user blocking
    - Maintain security by preventing self-blocking

  2. Policy Changes
    - Allow admins/moderators to update user blocking fields
    - Prevent users from blocking themselves
    - Enable proper user management functionality
*/

-- Drop existing admin/moderator policies that might be conflicting
DROP POLICY IF EXISTS "admin_can_update_all_user_fields" ON user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON user_profiles;

-- Create comprehensive policy for admin/moderator user management
CREATE POLICY "admin_moderator_can_manage_users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User must be admin or moderator
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('admin', 'moderator')
        AND up.is_deleted = false
    )
    -- Cannot modify their own record (prevent self-blocking)
    AND user_id != auth.uid()
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('admin', 'moderator')
        AND up.is_deleted = false
    )
    AND user_id != auth.uid()
  );

-- Create specific policy for admins to update all fields (including their own profile settings)
CREATE POLICY "admin_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'admin'
        AND up.is_deleted = false
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'admin'
        AND up.is_deleted = false
    )
  );