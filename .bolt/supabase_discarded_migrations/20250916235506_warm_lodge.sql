/*
  # Fix collaboration_reviews foreign key constraints

  1. Problem
    - Missing foreign key constraints between collaboration_reviews and user_profiles
    - Supabase cannot find relationships for reviewer_id and reviewee_id
    - This prevents proper joins in queries

  2. Solution
    - Add foreign key constraints for reviewer_id and reviewee_id
    - Reference user_profiles(user_id) for both columns
    - Enable proper relationship queries in Supabase

  3. Security
    - Maintain existing RLS policies
    - Ensure data integrity with foreign key constraints
*/

-- Add foreign key constraint for reviewer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'collaboration_reviews_reviewer_id_fkey'
    AND table_name = 'collaboration_reviews'
  ) THEN
    ALTER TABLE public.collaboration_reviews 
    ADD CONSTRAINT collaboration_reviews_reviewer_id_fkey 
    FOREIGN KEY (reviewer_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for reviewee_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'collaboration_reviews_reviewee_id_fkey'
    AND table_name = 'collaboration_reviews'
  ) THEN
    ALTER TABLE public.collaboration_reviews 
    ADD CONSTRAINT collaboration_reviews_reviewee_id_fkey 
    FOREIGN KEY (reviewee_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for offer_id if offers table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'collaboration_reviews_offer_id_fkey'
      AND table_name = 'collaboration_reviews'
    ) THEN
      ALTER TABLE public.collaboration_reviews 
      ADD CONSTRAINT collaboration_reviews_offer_id_fkey 
      FOREIGN KEY (offer_id) REFERENCES public.offers(offer_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;