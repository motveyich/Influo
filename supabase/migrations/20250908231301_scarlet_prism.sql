/*
  # Fix RLS policy for user blocking functionality

  1. Security Updates
    - Add RLS policy to allow admins and moderators to block users
    - Policy allows updating is_deleted, deleted_at, and deleted_by fields
    - Prevents users from blocking themselves through policy logic
    - Ensures only users with admin or moderator roles can perform blocking

  2. Policy Details
    - Name: "Admins and moderators can block users"
    - Operation: UPDATE
    - Target: user_profiles table
    - Permissions: admin and moderator roles only
    - Restrictions: Cannot block yourself, can only set deletion fields
*/

-- Create policy for admins and moderators to block users
CREATE POLICY "Admins and moderators can block users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the current user is admin or moderator
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
    )
    -- And prevent blocking yourself
    AND user_id != auth.uid()
  )
  WITH CHECK (
    -- Allow if the current user is admin or moderator
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
    )
    -- And prevent blocking yourself
    AND user_id != auth.uid()
  );