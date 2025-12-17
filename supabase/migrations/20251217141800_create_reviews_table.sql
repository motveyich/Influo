/*
  # Create Reviews Table

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `deal_id` (uuid) - Reference to offer/deal
      - `reviewer_id` (uuid, references user_profiles) - User who wrote the review
      - `reviewee_id` (uuid, references user_profiles) - User being reviewed
      - `rating` (numeric, 1-5) - Star rating
      - `title` (text, optional) - Review title
      - `comment` (text) - Review content
      - `collaboration_type` (text, optional) - Type of collaboration
      - `is_public` (boolean) - Whether review is public
      - `helpful_votes` (integer) - Number of helpful votes
      - `metadata` (jsonb) - Additional data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `reviews` table
    - Users can read public reviews or their own
    - Users can create reviews as reviewer
    - Users can update their own reviews

  3. Indexes
    - Index on reviewer_id for fast lookup
    - Index on reviewee_id for fast lookup
    - Index on rating for filtering
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid,
  reviewer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text NOT NULL,
  collaboration_type text,
  is_public boolean DEFAULT true NOT NULL,
  helpful_votes integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_deal_id ON reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read public reviews or reviews they are involved in
CREATE POLICY "Users can read reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    OR reviewer_id = auth.uid() 
    OR reviewee_id = auth.uid()
  );

-- Policy: Users can create reviews as reviewer
CREATE POLICY "Users can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- Policy: Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Function to update user average rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_user_rating_on_review()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  avg_rating numeric;
  review_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.reviewee_id;
  ELSE
    target_user_id := NEW.reviewee_id;
  END IF;

  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, review_count
  FROM reviews
  WHERE reviewee_id = target_user_id;

  UPDATE user_profiles
  SET 
    average_rating = ROUND(avg_rating, 2),
    total_reviews_count = review_count
  WHERE user_id = target_user_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_rating ON reviews;
CREATE TRIGGER trigger_update_user_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_on_review();