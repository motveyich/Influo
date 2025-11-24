/*
  # Add INSERT Policy for Influencers to Create Offers
  
  ## Changes
  1. Add policy allowing influencers to create offers (for auto-campaign applications)
  
  ## Security
  - Influencers can only create offers where they are the influencer
  - Policy checks that influencer_id matches the authenticated user
*/

-- Drop existing policy if it exists and create new one
DO $$ 
BEGIN
  -- Drop if exists
  DROP POLICY IF EXISTS "Influencers can create offers" ON offers;
  
  -- Create policy for influencers to insert offers
  CREATE POLICY "Influencers can create offers"
    ON offers
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (influencer_id = auth.uid())
    );
END $$;