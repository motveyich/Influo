/*
  # Add 'in_progress' status to auto_campaigns

  1. Changes
    - Updates the status constraint for auto_campaigns table to include 'in_progress'
    - This allows campaigns to transition from 'active' to 'in_progress' when target is reached

  2. Status flow
    - draft → active → in_progress → completed/closed
*/

ALTER TABLE auto_campaigns DROP CONSTRAINT IF EXISTS auto_campaigns_status_check;
ALTER TABLE auto_campaigns ADD CONSTRAINT auto_campaigns_status_check 
  CHECK (status IN ('draft', 'active', 'in_progress', 'closed', 'completed'));
