/*
  # Fix Reviews Foreign Key Constraint

  ## Problem
  The `reviews` table has a foreign key constraint to the `deals` table, but the code
  directly inserts offer_id or application_id into deal_id field, causing 409 errors.
  
  ## Solution
  Remove the foreign key constraint to make deal_id a universal field that can reference
  either offers.offer_id or applications.id, depending on collaboration_type.
  
  ## Changes
  1. Drop the foreign key constraint `reviews_deal_id_fkey`
  2. Add a comment to clarify that deal_id can reference offers or applications
  3. Keep the unique constraint to prevent duplicate reviews
*/

-- Drop the foreign key constraint to deals table
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_deal_id_fkey;

-- Add comment to clarify the purpose of deal_id
COMMENT ON COLUMN reviews.deal_id IS 'Universal ID that references either offers.offer_id or applications.id, depending on collaboration_type';

-- Ensure unique constraint exists (user can only review a deal once)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reviews_deal_reviewer_unique'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_deal_reviewer_unique UNIQUE (deal_id, reviewer_id);
  END IF;
END $$;