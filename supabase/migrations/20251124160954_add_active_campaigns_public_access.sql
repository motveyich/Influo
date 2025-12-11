/*
  # Add public access to active auto-campaigns

  1. Changes
    - Add RLS policy to allow all authenticated users to view active auto-campaigns
    - This allows influencers to browse active campaigns looking for collaborations
  
  2. Security
    - Only active campaigns are visible publicly
    - Users can still only modify their own campaigns
*/

-- Allow all authenticated users to view active campaigns
CREATE POLICY "Anyone can view active auto-campaigns"
  ON auto_campaigns
  FOR SELECT
  TO authenticated
  USING (status = 'active');
