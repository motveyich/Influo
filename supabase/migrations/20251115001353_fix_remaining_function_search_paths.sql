/*
  # Fix Remaining Function Search Paths
  
  1. Security Improvements
    - Set proper search_path for check_user_permission and log_admin_action
    - Drop all versions and recreate with correct signature
    
  2. Functions Fixed
    - check_user_permission
    - log_admin_action
*/

-- Drop all versions of check_user_permission
DROP FUNCTION IF EXISTS check_user_permission(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS check_user_permission(uuid, user_role) CASCADE;

-- Drop all versions of log_admin_action
DROP FUNCTION IF EXISTS log_admin_action(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS log_admin_action(uuid, text, text, uuid, jsonb) CASCADE;

-- Recreate check_user_permission with proper search_path
CREATE FUNCTION check_user_permission(user_id uuid, permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_val public.user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM user_profiles
  WHERE user_profiles.user_id = check_user_permission.user_id
  AND is_deleted = false
  LIMIT 1;
  
  -- Check if user has the required permission
  -- Admin and moderator roles have elevated permissions
  RETURN user_role_val IN ('admin', 'moderator');
END;
$$;

-- Recreate log_admin_action with proper search_path
CREATE FUNCTION log_admin_action(
  admin_id uuid,
  action_type text,
  action_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, action, details, created_at)
  VALUES (log_admin_action.admin_id, action_type, action_details, NOW());
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION check_user_permission(uuid, text) IS 
  'Checks if a user has a specific permission based on their role. Returns true if user is admin or moderator.';

COMMENT ON FUNCTION log_admin_action(uuid, text, jsonb) IS 
  'Logs an administrative action to the admin_logs table for audit purposes.';
