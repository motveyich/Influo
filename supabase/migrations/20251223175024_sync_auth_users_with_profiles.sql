/*
  # Sync Supabase Auth with User Profiles
  
  This migration sets up automatic synchronization between Supabase Auth (auth.users) 
  and our application's user_profiles table.
  
  1. New Functions
    - `handle_new_user()` - Automatically creates a user profile when a user signs up
    - `get_user_role()` - Helper function to get user's role
    - `is_user_blocked()` - Check if user is blocked/deleted
    
  2. Triggers
    - Auto-create profile on auth.users insert
    
  3. RLS Policy Updates
    - Add policy for public signup (anon users can insert)
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    user_type,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'user_type', NEW.raw_user_meta_data->>'userType', 'influencer'),
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_role, 'user');
END;
$$;

-- Function to check if user is blocked/deleted
CREATE OR REPLACE FUNCTION public.is_user_blocked(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = p_user_id
    AND (is_deleted = true OR deleted_at IS NOT NULL)
  );
END;
$$;

-- Add is_deleted and deleted_at columns to user_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deleted_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deleted_by uuid REFERENCES user_profiles(user_id);
  END IF;
END $$;

-- Update RLS policies for user_profiles to allow signup
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow public signup" ON user_profiles;

CREATE POLICY "Allow authenticated and anon signup"
  ON user_profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- RPC function for admin to block user
CREATE OR REPLACE FUNCTION public.admin_block_user(
  p_user_id uuid,
  p_blocked_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role text;
BEGIN
  -- Check if caller is admin or moderator
  SELECT role INTO v_admin_role FROM user_profiles WHERE user_id = p_blocked_by;
  
  IF v_admin_role NOT IN ('admin', 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Block user
  UPDATE user_profiles
  SET is_deleted = true,
      deleted_at = NOW(),
      deleted_by = p_blocked_by
  WHERE user_id = p_user_id;
  
  RETURN json_build_object('success', true);
END;
$$;

-- RPC function for admin to unblock user
CREATE OR REPLACE FUNCTION public.admin_unblock_user(
  p_user_id uuid,
  p_unblocked_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role text;
BEGIN
  -- Check if caller is admin or moderator
  SELECT role INTO v_admin_role FROM user_profiles WHERE user_id = p_unblocked_by;
  
  IF v_admin_role NOT IN ('admin', 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Unblock user
  UPDATE user_profiles
  SET is_deleted = false,
      deleted_at = NULL,
      deleted_by = NULL
  WHERE user_id = p_user_id;
  
  RETURN json_build_object('success', true);
END;
$$;