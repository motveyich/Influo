/*
  # Remove delivery time and revisions fields

  1. Database Changes
    - Remove `deliveryTime` and `revisions` from `service_details` in `influencer_cards` table
    - Clean up any existing data containing these fields

  2. Data Cleanup
    - Update all existing influencer cards to remove these fields from service_details JSON
    - Ensure no references remain in the database
*/

-- Remove deliveryTime and revisions from service_details in influencer_cards
UPDATE influencer_cards 
SET service_details = service_details - 'deliveryTime' - 'revisions'
WHERE service_details ? 'deliveryTime' OR service_details ? 'revisions';

-- Clean up any analytics data that might reference these fields
UPDATE card_analytics 
SET metrics = metrics - 'deliveryTime' - 'revisions'
WHERE metrics ? 'deliveryTime' OR metrics ? 'revisions';

-- Clean up user profiles influencer data
UPDATE user_profiles 
SET influencer_data = influencer_data - 'deliveryTime' - 'revisions'
WHERE influencer_data ? 'deliveryTime' OR influencer_data ? 'revisions';