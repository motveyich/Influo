/*
  # Auto Campaign Completion and Reactivation Logic

  ## Overview
  This migration implements automatic campaign completion and reactivation logic:
  
  1. **Auto-completion**: When all influencers in an auto-campaign complete their collaborations (status='completed'),
     the auto-campaign automatically transitions to 'completed' status
  
  2. **Reactivation on termination**: When an influencer terminates their collaboration (status='terminated'),
     the auto-campaign transitions back to 'active' status to send offers to other matching influencers
  
  ## Logic Details
  
  ### Auto-completion trigger:
  - Fires when an offer status changes to 'completed'
  - Checks if ALL offers for that auto_campaign_id have status='completed'
  - If yes, sets auto_campaign status to 'completed'
  
  ### Reactivation trigger:
  - Fires when an offer status changes to 'terminated'
  - Sets the auto_campaign status back to 'active' 
  - This allows the campaign to send new offers to other influencers
  - Excludes influencers who: terminated, declined, or are currently participating
  
  ## Tables Modified
  - auto_campaigns (status field)
  
  ## New Functions
  - check_auto_campaign_completion()
  - reactivate_auto_campaign_on_termination()
*/

-- Function to check if all offers in auto campaign are completed
-- and mark campaign as completed if so
CREATE OR REPLACE FUNCTION check_auto_campaign_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_campaign_id uuid;
  v_total_offers integer;
  v_completed_offers integer;
BEGIN
  -- Get the auto_campaign_id from the updated offer
  v_auto_campaign_id := NEW.auto_campaign_id;
  
  -- Skip if this offer is not part of an auto campaign
  IF v_auto_campaign_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only proceed if the new status is 'completed'
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Count total offers and completed offers for this auto campaign
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_offers, v_completed_offers
  FROM offers
  WHERE auto_campaign_id = v_auto_campaign_id
    AND status NOT IN ('declined', 'cancelled'); -- Don't count declined/cancelled
  
  -- If all active offers are completed, mark campaign as completed
  IF v_total_offers > 0 AND v_total_offers = v_completed_offers THEN
    UPDATE auto_campaigns
    SET 
      status = 'completed',
      updated_at = now()
    WHERE id = v_auto_campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to reactivate auto campaign when an offer is terminated
CREATE OR REPLACE FUNCTION reactivate_auto_campaign_on_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_campaign_id uuid;
  v_current_campaign_status text;
BEGIN
  -- Get the auto_campaign_id from the updated offer
  v_auto_campaign_id := NEW.auto_campaign_id;
  
  -- Skip if this offer is not part of an auto campaign
  IF v_auto_campaign_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only proceed if the new status is 'terminated'
  IF NEW.status <> 'terminated' THEN
    RETURN NEW;
  END IF;
  
  -- Get current campaign status
  SELECT status INTO v_current_campaign_status
  FROM auto_campaigns
  WHERE id = v_auto_campaign_id;
  
  -- Reactivate the campaign if it's not already completed or closed
  IF v_current_campaign_status NOT IN ('completed', 'closed') THEN
    UPDATE auto_campaigns
    SET 
      status = 'active',
      updated_at = now()
    WHERE id = v_auto_campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-completion
DROP TRIGGER IF EXISTS auto_campaign_completion_trigger ON offers;

CREATE TRIGGER auto_campaign_completion_trigger
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status <> 'completed')
  EXECUTE FUNCTION check_auto_campaign_completion();

-- Create trigger for reactivation on termination
DROP TRIGGER IF EXISTS auto_campaign_reactivation_trigger ON offers;

CREATE TRIGGER auto_campaign_reactivation_trigger
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  WHEN (NEW.status = 'terminated' AND OLD.status <> 'terminated')
  EXECUTE FUNCTION reactivate_auto_campaign_on_termination();
