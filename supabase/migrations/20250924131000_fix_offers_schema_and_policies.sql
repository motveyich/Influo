/*
  Align offers schema and admin policies with application code

  - Ensure offers table supports optional campaign link and influencer_card_id
  - Extend offers.status allowed values used by the app
  - Keep policies idempotent and avoid duplicate/conflicting ones
*/

-- Offers schema adjustments
DO $$
DECLARE
  conname text;
BEGIN
  -- Add influencer_card_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'influencer_card_id'
  ) THEN
    ALTER TABLE offers
      ADD COLUMN influencer_card_id uuid REFERENCES influencer_cards(id) ON DELETE SET NULL;
  END IF;

  -- Allow campaign_id to be nullable (offers can be created without campaign)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'campaign_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE offers ALTER COLUMN campaign_id DROP NOT NULL;
  END IF;

  -- Normalize details column default to jsonb if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'details'
  ) THEN
    ALTER TABLE offers ALTER COLUMN details SET DEFAULT '{}'::jsonb;
  END IF;

  -- Replace status check constraint with the set used by the app
  -- Drop any existing CHECK on offers.status (safe even if none)
  PERFORM 1;
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE t.relname = 'offers' AND a.attname = 'status' AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE offers DROP CONSTRAINT IF EXISTS %I', conname);
  END LOOP;

  -- Add new explicit constraint name to make future updates easier
  ALTER TABLE offers
    ADD CONSTRAINT offers_status_check
    CHECK (status IN ('pending','accepted','declined','in_progress','completed','terminated','cancelled'));
END $$;

-- RLS policy cleanup for user blocking (no-op if already applied by previous migrations)
DO $$
BEGIN
  -- Ensure base user self-update policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'users_can_update_own_profile'
  ) THEN
    CREATE POLICY "users_can_update_own_profile"
      ON user_profiles FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Ensure admins/moderators can manage other users (prevent self-blocking)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'admin_moderator_can_manage_users'
  ) THEN
    CREATE POLICY "admin_moderator_can_manage_users"
      ON user_profiles FOR UPDATE TO authenticated
      USING (
        user_id != auth.uid() AND EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.user_id = auth.uid() AND up.role IN ('admin','moderator') AND up.is_deleted = false
        )
      )
      WITH CHECK (
        user_id != auth.uid() AND EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.user_id = auth.uid() AND up.role IN ('admin','moderator') AND up.is_deleted = false
        )
      );
  END IF;
END $$;

