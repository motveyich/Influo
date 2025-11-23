/*
  # Campaign Metrics System
  
  1. New Tables
    - `campaign_views`
      - `view_id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to campaigns)
      - `user_id` (uuid, nullable - can be anonymous)
      - `viewed_at` (timestamptz)
      - Tracks each time a campaign card is displayed
  
  2. Functions
    - `update_campaign_metrics()` - Recalculates campaign metrics from offers and views
    - Automatically called when offers are created/updated
  
  3. Triggers
    - Trigger on offers table to update campaign metrics
  
  4. Security
    - Enable RLS on `campaign_views`
    - Allow authenticated users to insert their own views
    - Allow anyone to view aggregated metrics
*/

-- Create campaign_views table
CREATE TABLE IF NOT EXISTS campaign_views (
  view_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);

-- Create index for faster metrics calculation
CREATE INDEX IF NOT EXISTS idx_campaign_views_campaign_id ON campaign_views(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_views_viewed_at ON campaign_views(viewed_at);

-- Enable RLS
ALTER TABLE campaign_views ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert views
CREATE POLICY "Users can track their views"
  ON campaign_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow everyone to read views (for metrics)
CREATE POLICY "Anyone can read views"
  ON campaign_views
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicants int;
  v_accepted int;
  v_impressions int;
BEGIN
  -- Count total applications (all offers for this campaign)
  SELECT COUNT(*)
  INTO v_applicants
  FROM offers
  WHERE campaign_id = p_campaign_id;
  
  -- Count accepted offers (status = 'accepted' or 'in_progress' or 'completed')
  SELECT COUNT(*)
  INTO v_accepted
  FROM offers
  WHERE campaign_id = p_campaign_id
    AND status IN ('accepted', 'in_progress', 'completed');
  
  -- Count total views (impressions)
  SELECT COUNT(*)
  INTO v_impressions
  FROM campaign_views
  WHERE campaign_id = p_campaign_id;
  
  -- Update campaign metrics
  UPDATE campaigns
  SET 
    metrics = jsonb_build_object(
      'applicants', COALESCE(v_applicants, 0),
      'accepted', COALESCE(v_accepted, 0),
      'impressions', COALESCE(v_impressions, 0),
      'engagement', CASE 
        WHEN v_impressions > 0 THEN ROUND((v_applicants::numeric / v_impressions::numeric) * 100, 2)
        ELSE 0
      END
    ),
    updated_at = now()
  WHERE campaign_id = p_campaign_id;
END;
$$;

-- Trigger function for offers changes
CREATE OR REPLACE FUNCTION trigger_update_campaign_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update metrics for the affected campaign
  IF TG_OP = 'DELETE' THEN
    PERFORM update_campaign_metrics(OLD.campaign_id);
    RETURN OLD;
  ELSE
    PERFORM update_campaign_metrics(NEW.campaign_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on offers table
DROP TRIGGER IF EXISTS trigger_offers_metrics ON offers;
CREATE TRIGGER trigger_offers_metrics
  AFTER INSERT OR UPDATE OR DELETE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_campaign_metrics();

-- Trigger function for campaign_views changes
CREATE OR REPLACE FUNCTION trigger_update_campaign_views_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update metrics for the affected campaign
  IF TG_OP = 'DELETE' THEN
    PERFORM update_campaign_metrics(OLD.campaign_id);
    RETURN OLD;
  ELSE
    PERFORM update_campaign_metrics(NEW.campaign_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on campaign_views table
DROP TRIGGER IF EXISTS trigger_campaign_views_metrics ON campaign_views;
CREATE TRIGGER trigger_campaign_views_metrics
  AFTER INSERT OR DELETE ON campaign_views
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_campaign_views_metrics();

-- Initialize metrics for existing campaigns
DO $$
DECLARE
  campaign_record RECORD;
BEGIN
  FOR campaign_record IN SELECT campaign_id FROM campaigns
  LOOP
    PERFORM update_campaign_metrics(campaign_record.campaign_id);
  END LOOP;
END;
$$;
