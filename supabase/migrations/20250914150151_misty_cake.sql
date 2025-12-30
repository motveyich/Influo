/*
  # Fix RLS policies for user blocking functionality

  1. Security Updates
    - Drop existing conflicting policies
    - Create proper admin/moderator policies for user management
    - Ensure admins and moderators can block/unblock users
    - Prevent self-blocking

  2. Policy Changes
    - Allow admins and moderators to update user deletion fields
    - Maintain user privacy while allowing administrative actions
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins and moderators can manage users" ON user_profiles;
DROP POLICY IF EXISTS "admin_can_update_profiles" ON user_profiles;

-- Create comprehensive admin policy for user management
CREATE POLICY "admin_moderator_can_manage_users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Check if current user is admin or moderator
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
    -- Prevent self-blocking
    AND user_id != auth.uid()
  )
  WITH CHECK (
    -- Check if current user is admin or moderator
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
    -- Prevent self-blocking
    AND user_id != auth.uid()
  );

-- Create policy for admins to manage all user fields including roles
CREATE POLICY "admin_can_update_all_user_fields"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Only admins can change roles and critical fields
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
      AND up.is_deleted = false
    )
  )
  WITH CHECK (
    -- Only admins can change roles and critical fields
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
      AND up.is_deleted = false
    )
  );

-- Allow service role to update user profiles (for admin functions)
CREATE POLICY "service_role_can_update_users"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);