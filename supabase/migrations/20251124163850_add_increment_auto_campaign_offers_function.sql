/*
  # Add Function to Increment Auto Campaign Offers Count
  
  ## Changes
  1. Create function to atomically increment sent_offers_count
  
  ## Security
  - Function is accessible to authenticated users
  - Updates only the specific campaign
*/

-- Create function to increment sent offers count
CREATE OR REPLACE FUNCTION increment_auto_campaign_offers(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auto_campaigns
  SET sent_offers_count = COALESCE(sent_offers_count, 0) + 1,
      updated_at = now()
  WHERE id = campaign_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_auto_campaign_offers(uuid) TO authenticated;