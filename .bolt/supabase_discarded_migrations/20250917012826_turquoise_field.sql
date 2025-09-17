/*
  # Add foreign key constraints for collaboration_reviews table

  1. Foreign Key Constraints
    - Add foreign key constraint for `reviewer_id` referencing `user_profiles(user_id)`
    - Add foreign key constraint for `reviewee_id` referencing `user_profiles(user_id)`
    
  2. Security
    - These constraints will enable proper table joins in Supabase queries
    - Will allow the application to fetch reviewer and reviewee profile information
    
  3. Notes
    - This fixes the error: "Could not find a relationship between 'collaboration_reviews' and 'user_profiles'"
    - Required for the ProfilesPage to load user reviews correctly
*/

-- Add foreign key constraint for reviewer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'collaboration_reviews_reviewer_id_fkey'
    AND table_name = 'collaboration_reviews'
  ) THEN
    ALTER TABLE collaboration_reviews 
    ADD CONSTRAINT collaboration_reviews_reviewer_id_fkey 
    FOREIGN KEY (reviewer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
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
    ALTER TABLE collaboration_reviews 
    ADD CONSTRAINT collaboration_reviews_reviewee_id_fkey 
    FOREIGN KEY (reviewee_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;