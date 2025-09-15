/*
  # Fix CHECK CONSTRAINTS with subqueries

  This migration removes CHECK CONSTRAINTS that use subqueries (EXISTS, SELECT) 
  which are not supported in PostgreSQL.

  1. Issues Fixed
    - Remove CHECK CONSTRAINTS with EXISTS subqueries
    - Replace with FOREIGN KEY constraints where appropriate
    - Remove unsupported constraint patterns

  2. Tables Updated
    - All tables with problematic CHECK CONSTRAINTS
    - Add proper FOREIGN KEY constraints instead

  3. Security
    - Maintain data integrity through FOREIGN KEY relationships
    - Keep simple CHECK constraints for basic validation
*/

-- Drop any CHECK constraints that might use subqueries
-- These are replaced with FOREIGN KEY constraints below

DO $$
BEGIN
  -- Drop constraint if it exists on user_profiles table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_user' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT check_valid_user;
  END IF;

  -- Drop constraint if it exists on platform_news table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_author' 
    AND table_name = 'platform_news'
  ) THEN
    ALTER TABLE platform_news DROP CONSTRAINT check_valid_author;
  END IF;

  -- Drop constraint if it exists on platform_updates table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_creator' 
    AND table_name = 'platform_updates'
  ) THEN
    ALTER TABLE platform_updates DROP CONSTRAINT check_valid_creator;
  END IF;

  -- Drop constraint if it exists on platform_events table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_creator' 
    AND table_name = 'platform_events'
  ) THEN
    ALTER TABLE platform_events DROP CONSTRAINT check_valid_creator;
  END IF;

  -- Drop any other potential CHECK constraints with subqueries
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'participants_check'
  ) THEN
    ALTER TABLE collaboration_reviews DROP CONSTRAINT participants_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'different_users'
  ) THEN
    ALTER TABLE payment_requests DROP CONSTRAINT different_users;
  END IF;

  -- Drop any admin/moderator role checks in CHECK constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%admin%' OR constraint_name LIKE '%moderator%'
  ) THEN
    -- These will be handled by RLS policies instead
    NULL;
  END IF;
END $$;

-- Ensure all necessary FOREIGN KEY constraints exist
-- These replace the CHECK constraints with subqueries

-- Add FOREIGN KEY for platform_news if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_news') THEN
    -- Add foreign key for created_by if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'platform_news_created_by_fkey'
    ) THEN
      ALTER TABLE platform_news 
      ADD CONSTRAINT platform_news_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add FOREIGN KEY for platform_updates if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_updates') THEN
    -- Foreign key should already exist, but ensure it's there
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'platform_updates_created_by_fkey'
    ) THEN
      ALTER TABLE platform_updates 
      ADD CONSTRAINT platform_updates_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add FOREIGN KEY for platform_events if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_events') THEN
    -- Foreign key should already exist, but ensure it's there
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'platform_events_created_by_fkey'
    ) THEN
      ALTER TABLE platform_events 
      ADD CONSTRAINT platform_events_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Ensure collaboration_offers has proper constraints without subqueries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collaboration_offers') THEN
    -- Add foreign keys if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'collaboration_offers_influencer_id_fkey'
    ) THEN
      ALTER TABLE collaboration_offers 
      ADD CONSTRAINT collaboration_offers_influencer_id_fkey 
      FOREIGN KEY (influencer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'collaboration_offers_advertiser_id_fkey'
    ) THEN
      ALTER TABLE collaboration_offers 
      ADD CONSTRAINT collaboration_offers_advertiser_id_fkey 
      FOREIGN KEY (advertiser_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Ensure payment_requests has proper constraints without subqueries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_requests') THEN
    -- Add foreign key for offer_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'payment_requests_offer_id_fkey'
    ) THEN
      ALTER TABLE payment_requests 
      ADD CONSTRAINT payment_requests_offer_id_fkey 
      FOREIGN KEY (offer_id) REFERENCES collaboration_offers(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for created_by if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'payment_requests_created_by_fkey'
    ) THEN
      ALTER TABLE payment_requests 
      ADD CONSTRAINT payment_requests_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for confirmed_by if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'payment_requests_confirmed_by_fkey'
    ) THEN
      ALTER TABLE payment_requests 
      ADD CONSTRAINT payment_requests_confirmed_by_fkey 
      FOREIGN KEY (confirmed_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Ensure collaboration_reviews has proper constraints without subqueries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collaboration_reviews') THEN
    -- Add foreign keys if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'collaboration_reviews_offer_id_fkey'
    ) THEN
      ALTER TABLE collaboration_reviews 
      ADD CONSTRAINT collaboration_reviews_offer_id_fkey 
      FOREIGN KEY (offer_id) REFERENCES collaboration_offers(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'collaboration_reviews_reviewer_id_fkey'
    ) THEN
      ALTER TABLE collaboration_reviews 
      ADD CONSTRAINT collaboration_reviews_reviewer_id_fkey 
      FOREIGN KEY (reviewer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'collaboration_reviews_reviewee_id_fkey'
    ) THEN
      ALTER TABLE collaboration_reviews 
      ADD CONSTRAINT collaboration_reviews_reviewee_id_fkey 
      FOREIGN KEY (reviewee_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Clean up any other potentially problematic CHECK constraints
DO $$
BEGIN
  -- Remove any other CHECK constraints that might use subqueries
  -- This is a safety measure for any constraints we might have missed

  -- List of potentially problematic constraint patterns to remove
  DECLARE
    constraint_record RECORD;
  BEGIN
    -- Find and drop CHECK constraints that contain 'EXISTS' or 'SELECT'
    FOR constraint_record IN
      SELECT 
        tc.constraint_name,
        tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.constraint_type = 'CHECK'
        AND (
          cc.check_clause ILIKE '%EXISTS%' OR
          cc.check_clause ILIKE '%SELECT%'
        )
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 
        constraint_record.table_name, 
        constraint_record.constraint_name);
      
      RAISE NOTICE 'Dropped CHECK constraint % from table %', 
        constraint_record.constraint_name, 
        constraint_record.table_name;
    END LOOP;
  END;
END $$;