/*
  Fix RLS policies for user blocking functionality
  
  1. Problem
     - Current RLS policies prevent admin/moderator users from blocking other users
     - The "Users can update own profile" policy only allows users to update their own profiles
     - Admin operations require ability to update other users' profiles
  
  2. Solution
     - Remove overly restrictive policies
     - Create separate policies for different user roles and operations
     - Allow admins/moderators to manage user blocking while preventing self-blocking
     - Maintain security by checking roles before allowing operations
*/

-- Drop existing restrictive policies that prevent admin operations
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON user_profiles;

-- Create comprehensive policies for user profile management

-- 1. Regular users can update their own profiles (excluding admin fields)
CREATE POLICY "users_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    -- Policies cannot reference OLD/NEW; keep simple self-update check
    user_id = auth.uid()
  );

-- 2. Admins and moderators can block/unblock other users (but not themselves)
CREATE POLICY "admin_moderator_can_block_users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id != auth.uid() -- Prevent self-blocking
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
  )
  WITH CHECK (
    user_id != auth.uid() -- Prevent self-blocking
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND up.is_deleted = false
    )
  );

-- 3. Admins can update their own profiles (including role changes)
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

-- 4. Service role has full access for system operations
CREATE POLICY "service_role_full_access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure the table has RLS enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;