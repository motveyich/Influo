/*
  # Add admin and moderator policies for moderation

  1. Changes
    - Add policy for admins/moderators to update influencer_cards
    - Add policies for moderation_queue access
  
  2. Security
    - Only users with 'admin' or 'moderator' role can moderate content
    - Uses role check from user_profiles table
*/

-- Add admin/moderator policy for influencer_cards
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'influencer_cards' 
    AND policyname = 'Admins and moderators can moderate all cards'
  ) THEN
    CREATE POLICY "Admins and moderators can moderate all cards"
      ON influencer_cards
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
  END IF;
END $$;

-- Add policies for moderation_queue
DO $$ 
BEGIN
  -- Allow admins and moderators to read moderation queue
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'moderation_queue' 
    AND policyname = 'Admins and moderators can read moderation queue'
  ) THEN
    CREATE POLICY "Admins and moderators can read moderation queue"
      ON moderation_queue
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('admin', 'moderator')
        )
      );
  END IF;

  -- Allow admins and moderators to update moderation queue
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'moderation_queue' 
    AND policyname = 'Admins and moderators can update moderation queue'
  ) THEN
    CREATE POLICY "Admins and moderators can update moderation queue"
      ON moderation_queue
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
  END IF;

  -- Allow system to insert into moderation queue
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'moderation_queue' 
    AND policyname = 'Allow insert into moderation queue'
  ) THEN
    CREATE POLICY "Allow insert into moderation queue"
      ON moderation_queue
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
