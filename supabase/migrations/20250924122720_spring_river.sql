/*
  Fix RLS policies for user blocking functionality
  
  1. Problems found
     - Invalid usage of OLD/NEW in RLS policies (not allowed in policy expressions)
     - Conflicting/duplicate policies across previous migrations
  
  2. Solution
     - Drop conflicting policies if present
     - Recreate minimal, correct policies without OLD/NEW
     - Add a trigger to prevent non-admins from changing admin-only fields or self-blocking
*/

-- Ensure the table has RLS enabled (idempotent across envs)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies from earlier migrations
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins and moderators can block users" ON user_profiles;
DROP POLICY IF EXISTS "Admins and moderators can manage users" ON user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_manage_users" ON user_profiles;
DROP POLICY IF EXISTS "admin_moderator_can_block_users" ON user_profiles;
DROP POLICY IF EXISTS "admin_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "service_role_full_access" ON user_profiles;

-- Baseline policy: users can update only their own row
CREATE POLICY "users_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins and moderators can update other users (but not themselves for block)
CREATE POLICY "admin_moderator_can_manage_users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND COALESCE(up.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'moderator')
      AND COALESCE(up.is_deleted, false) = false
    )
  );

-- Service role full access for backend jobs
CREATE POLICY "service_role_full_access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Guardrails via trigger: prevent non-admins from modifying admin-only fields
-- and prevent self-blocking attempts
CREATE OR REPLACE FUNCTION enforce_user_profile_update_rules()
RETURNS TRIGGER AS $$
DECLARE
  acting_role text;
  is_admin boolean := false;
  is_moderator boolean := false;
BEGIN
  -- Determine acting user's role (prefer explicit role column on their own profile)
  SELECT COALESCE(up.role::text, 'user')
  INTO acting_role
  FROM user_profiles up
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  is_admin := (acting_role = 'admin');
  is_moderator := (acting_role = 'moderator');

  -- Prevent self-blocking by anyone
  IF NEW.user_id = auth.uid() THEN
    IF COALESCE(NEW.is_deleted, false) <> COALESCE(OLD.is_deleted, false)
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
       OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by THEN
      RAISE EXCEPTION 'You cannot block or delete your own profile';
    END IF;
  END IF;

  -- Prevent non-admin users from changing admin-only fields (role and deletion fields)
  IF NOT is_admin THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;

    IF COALESCE(NEW.is_deleted, false) <> COALESCE(OLD.is_deleted, false)
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
       OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by THEN
      -- Allow moderators to block/unblock others, but never themselves (handled above)
      IF NOT is_moderator THEN
        RAISE EXCEPTION 'Only moderators or admins can block/unblock users';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_user_profile_update_rules_trg ON user_profiles;
CREATE TRIGGER enforce_user_profile_update_rules_trg
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_user_profile_update_rules();