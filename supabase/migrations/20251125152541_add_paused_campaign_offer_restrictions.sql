/*
  # Add restrictions for offers from paused campaigns

  1. Changes
    - Add check function to prevent influencers from accepting offers from paused campaigns
    - Update RLS policy to check campaign status when updating offers
    - Influencers can only accept/update offers if campaign is not paused

  2. Security
    - Ensures data integrity by preventing offer acceptance during campaign pause
*/

-- Create a function to check if a campaign is paused
CREATE OR REPLACE FUNCTION is_campaign_paused(campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT status = 'paused'
  FROM auto_campaigns
  WHERE id = campaign_id;
$$;

-- Drop existing update policy for influencers on offers
DROP POLICY IF EXISTS "Users can update their offers" ON offers;
DROP POLICY IF EXISTS "Influencers can update offers sent to them" ON offers;

-- Create new update policy that checks if campaign is paused
CREATE POLICY "Influencers can update offers if campaign not paused"
  ON offers FOR UPDATE
  TO authenticated
  USING (
    influencer_id = auth.uid() 
    AND (
      auto_campaign_id IS NULL 
      OR NOT is_campaign_paused(auto_campaign_id)
    )
  )
  WITH CHECK (
    influencer_id = auth.uid()
    AND (
      auto_campaign_id IS NULL 
      OR NOT is_campaign_paused(auto_campaign_id)
    )
  );

-- Recreate advertiser update policy (unchanged)
CREATE POLICY "Advertisers can update their offers"
  ON offers FOR UPDATE
  TO authenticated
  USING (advertiser_id = auth.uid())
  WITH CHECK (advertiser_id = auth.uid());