/*
  # Remove Unused Indexes - Part 3
  
  1. Performance Improvements
    - Continue dropping unused indexes
    
  2. Indexes Removed (Part 3)
    - Payment requests indexes
    - Platform content indexes (news, events, updates)
*/

-- Payment requests indexes
DROP INDEX IF EXISTS idx_payment_requests_created_by;
DROP INDEX IF EXISTS idx_payment_requests_status;
DROP INDEX IF EXISTS idx_payment_requests_created_at;

-- Platform news indexes
DROP INDEX IF EXISTS idx_platform_news_published_at;
DROP INDEX IF EXISTS idx_platform_news_category;
DROP INDEX IF EXISTS idx_platform_news_is_published;
DROP INDEX IF EXISTS idx_platform_news_created_by;

-- Platform events indexes
DROP INDEX IF EXISTS idx_platform_events_type;
DROP INDEX IF EXISTS idx_platform_events_is_published;
DROP INDEX IF EXISTS idx_platform_events_created_by;

-- Platform updates indexes
DROP INDEX IF EXISTS idx_platform_updates_type;
DROP INDEX IF EXISTS idx_platform_updates_is_published;
DROP INDEX IF EXISTS idx_platform_updates_is_important;
DROP INDEX IF EXISTS idx_platform_updates_created_by;
