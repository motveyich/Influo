/*
  # Fix User Blocking RLS Policies

  1. Security Updates
    - Drop existing restrictive UPDATE policy on user_profiles
    - Create new policy allowing admins to update user blocking status
    - Allow users to update their own profiles (except blocking fields)
    - Ensure admins can block/unblock any user

  2. Changes Made
    - Removed overly restrictive UPDATE policy
    - Added separate policies for user self-updates and admin blocking
    - Protected sensitive fields from regular user updates
*/

-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create policy for users to update their own profiles (excluding admin fields)
CREATE POLICY "Users can update own profile data"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Prevent users from modifying admin-controlled fields
    is_deleted = OLD.is_deleted AND
    deleted_at = OLD.deleted_at AND
    deleted_by = OLD.deleted_by AND
    role = OLD.role
  );

-- Create policy for admins to manage user blocking status
CREATE POLICY "Admins can manage user blocking"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'moderator')
    )
  );

-- Create policy for admins to update any user data
CREATE POLICY "Admins can update any user"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
    )
  );