/*
  # Make user profile fields nullable for registration

  This migration makes full_name and user_type fields nullable in user_profiles table
  to allow user registration without requiring these fields upfront.

  ## Changes
  - ALTER TABLE user_profiles: Make full_name nullable
  - ALTER TABLE user_profiles: Make user_type nullable

  ## Reason
  Users should be able to register with just email, password, and username.
  The full_name and user_type can be filled in later during profile setup.
*/

-- Make full_name nullable
ALTER TABLE user_profiles ALTER COLUMN full_name DROP NOT NULL;

-- Make user_type nullable
ALTER TABLE user_profiles ALTER COLUMN user_type DROP NOT NULL;