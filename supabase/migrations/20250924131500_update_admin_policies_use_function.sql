/*
  Use get_user_role() in admin policies to respect assignments in user_roles
*/

DO $$
BEGIN
  -- Drop if present to avoid duplicate-name errors, then recreate
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'admin_moderator_can_manage_users'
  ) THEN
    DROP POLICY "admin_moderator_can_manage_users" ON user_profiles;
  END IF;

  CREATE POLICY "admin_moderator_can_manage_users"
    ON user_profiles FOR UPDATE TO authenticated
    USING (
      user_id != auth.uid() AND get_user_role(auth.uid()) IN ('moderator','admin')
    )
    WITH CHECK (
      user_id != auth.uid() AND get_user_role(auth.uid()) IN ('moderator','admin')
    );

  -- Ensure admin self-update policy remains intact for admins editing their own non-blocking fields
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'admin_can_update_own_profile'
  ) THEN
    CREATE POLICY "admin_can_update_own_profile"
      ON user_profiles FOR UPDATE TO authenticated
      USING (user_id = auth.uid() AND get_user_role(auth.uid()) = 'admin')
      WITH CHECK (user_id = auth.uid() AND get_user_role(auth.uid()) = 'admin');
  END IF;
END $$;

