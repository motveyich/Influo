/*
  # Add 'paused' status to auto_campaigns

  1. Changes
    - Add 'paused' status to auto_campaigns status constraint
    - Campaigns can be paused from 'active' or 'in_progress' states
    - Paused campaigns are hidden from public "All Campaigns" view
    - Offers from paused campaigns cannot be accepted by influencers

  2. Security
    - No RLS changes needed
*/

-- Drop the existing constraint
ALTER TABLE auto_campaigns 
DROP CONSTRAINT IF EXISTS auto_campaigns_status_check;

-- Add the new constraint with 'paused' status
ALTER TABLE auto_campaigns 
ADD CONSTRAINT auto_campaigns_status_check 
CHECK (status IN ('draft', 'active', 'in_progress', 'paused', 'closed', 'completed'));