/*
  # Fix admin user blocking RLS policy

  1. Policy Updates
    - Drop existing problematic policy for admin/moderator user blocking
    - Create new comprehensive policy that allows admins and moderators to update user profiles
    - Ensure the policy correctly checks user roles and prevents self-blocking

  2. Security
    - Maintain RLS protection while allowing proper admin functionality
    - Prevent admins from blocking themselves
    - Ensure only users with admin/moderator roles can perform blocking operations
*/

-- Drop the existing policy that might be causing issues
DROP POLICY IF EXISTS "Admins and moderators can block users" ON user_profiles;

-- Create a new comprehensive policy for admin/moderator user management
CREATE POLICY "Admins and moderators can manage users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the current user is an admin or moderator
    EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
    )
    -- Prevent self-blocking (admins can't block themselves)
    AND user_id != auth.uid()
  )
  WITH CHECK (
    -- Same conditions for the WITH CHECK clause
    EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
    )
    AND user_id != auth.uid()
  );