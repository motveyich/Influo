/*
  # Add sync function for campaign status
  
  ## Overview
  Creates a utility function to synchronize auto campaign statuses based on their offers.
  This ensures campaigns are marked as completed when all offers are completed,
  even if the trigger didn't fire (e.g., data existed before trigger creation).
  
  ## New Functions
  - sync_auto_campaign_statuses() - Checks and updates all campaign statuses
  
  ## Usage
  This function can be called manually or scheduled to run periodically.
  It will update any campaigns that should be marked as completed.
*/

-- Function to sync all auto campaign statuses
CREATE OR REPLACE FUNCTION sync_auto_campaign_statuses()
RETURNS TABLE(
  campaign_id uuid,
  campaign_title text,
  old_status text,
  new_status text,
  offers_total bigint,
  offers_completed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH campaign_stats AS (
    SELECT 
      ac.id,
      ac.title,
      ac.status,
      COUNT(o.offer_id) as total_offers,
      COUNT(o.offer_id) FILTER (WHERE o.status = 'completed') as completed_offers,
      COUNT(o.offer_id) FILTER (WHERE o.status NOT IN ('declined', 'cancelled')) as active_offers
    FROM auto_campaigns ac
    LEFT JOIN offers o ON o.auto_campaign_id = ac.id
    WHERE ac.status NOT IN ('completed', 'closed')
    GROUP BY ac.id, ac.title, ac.status
  ),
  campaigns_to_complete AS (
    SELECT 
      id,
      title,
      status,
      total_offers,
      completed_offers
    FROM campaign_stats
    WHERE active_offers > 0 
      AND active_offers = completed_offers
  )
  UPDATE auto_campaigns ac
  SET 
    status = 'completed',
    updated_at = now()
  FROM campaigns_to_complete ctc
  WHERE ac.id = ctc.id
  RETURNING 
    ac.id,
    ctc.title,
    ctc.status,
    ac.status,
    ctc.total_offers,
    ctc.completed_offers;
END;
$$;
