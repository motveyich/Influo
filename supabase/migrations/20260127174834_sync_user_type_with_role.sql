/*
  # Sync user_type with role field for admin and moderator

  1. Changes
    - Copy values from 'role' field to 'user_type' field for admin and moderator users
    - Set user_type to NULL for regular users (where role = 'user')
    - This ensures backward compatibility and fixes 403 errors in admin panel
  
  2. Why
    - JWT Strategy now reads from 'role' field
    - user_type field has CHECK constraint allowing only 'admin', 'moderator', or NULL
    - Regular users should have NULL in user_type
    - This migration ensures both fields are in sync
*/

-- Update user_type from role for admin and moderator users
UPDATE user_profiles
SET user_type = role::text
WHERE role IN ('admin', 'moderator') AND (user_type IS NULL OR user_type != role::text);

-- Set user_type to NULL for regular users
UPDATE user_profiles
SET user_type = NULL
WHERE role = 'user' AND user_type IS NOT NULL;
