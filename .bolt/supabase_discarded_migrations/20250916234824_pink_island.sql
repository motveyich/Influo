/*
  # Add foreign key constraints for collaboration_reviews table

  1. Foreign Key Constraints
    - Add foreign key constraint for `reviewer_id` referencing `user_profiles.user_id`
    - Add foreign key constraint for `reviewee_id` referencing `user_profiles.user_id`

  2. Security
    - These constraints ensure data integrity between collaboration_reviews and user_profiles tables
*/

-- Add foreign key constraints to collaboration_reviews table
DO $$
BEGIN
  -- Check if collaboration_reviews table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collaboration_reviews') THEN
    
    -- Add foreign key constraint for reviewer_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'collaboration_reviews_reviewer_id_fkey'
    ) THEN
      ALTER TABLE collaboration_reviews
      ADD CONSTRAINT collaboration_reviews_reviewer_id_fkey 
      FOREIGN KEY (reviewer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for reviewee_id
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