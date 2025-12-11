/*
  # Add admin policies for campaigns management

  1. Changes
    - Add policy for admins and moderators to update campaigns
    - Allows admins/moderators to soft-delete campaigns by setting is_deleted flag
  
  2. Security
    - Only users with 'admin' or 'moderator' role can update campaigns
    - Uses role check from user_profiles table
*/

-- Drop existing policy if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaigns' 
    AND policyname = 'Admins and moderators can manage all campaigns'
  ) THEN
    DROP POLICY "Admins and moderators can manage all campaigns" ON campaigns;
  END IF;
END $$;

-- Create policy for admins and moderators to update campaigns
CREATE POLICY "Admins and moderators can manage all campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );
