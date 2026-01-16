/*
  # Make campaign_id nullable in offers table
  
  1. Changes
    - Make campaign_id nullable to support both manual campaigns and auto_campaigns
    - Auto-campaigns use auto_campaign_id instead of campaign_id
    - Manual campaigns/offers use campaign_id
*/

-- Make campaign_id nullable
ALTER TABLE offers 
ALTER COLUMN campaign_id DROP NOT NULL;