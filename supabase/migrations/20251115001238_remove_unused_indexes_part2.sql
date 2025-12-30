/*
  # Remove Unused Indexes - Part 2
  
  1. Performance Improvements
    - Continue dropping unused indexes
    
  2. Indexes Removed (Part 2)
    - Influencer cards auxiliary indexes
    - Offers indexes
    - Analytics indexes
*/

-- Influencer cards indexes
DROP INDEX IF EXISTS idx_influencer_cards_user_id;
DROP INDEX IF EXISTS idx_influencer_cards_is_active;
DROP INDEX IF EXISTS idx_influencer_cards_last_updated;
DROP INDEX IF EXISTS idx_influencer_cards_platform_active;
DROP INDEX IF EXISTS idx_influencer_cards_not_deleted;

-- Offers indexes
DROP INDEX IF EXISTS idx_offers_campaign_id;

-- Analytics indexes
DROP INDEX IF EXISTS idx_analytics_events_user_id;
DROP INDEX IF EXISTS idx_analytics_events_event_type;
DROP INDEX IF EXISTS idx_analytics_events_timestamp;
