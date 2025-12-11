/*
  # Remove Unused Indexes - Part 4
  
  1. Performance Improvements
    - Continue dropping unused indexes
    
  2. Indexes Removed (Part 4)
    - Favorites and applications indexes
    - Card and application analytics indexes
    - User roles indexes
*/

-- Favorites indexes
DROP INDEX IF EXISTS idx_favorites_created_at;

-- Applications indexes
DROP INDEX IF EXISTS idx_applications_created_at;

-- Card analytics indexes
DROP INDEX IF EXISTS idx_card_analytics_card;
DROP INDEX IF EXISTS idx_card_analytics_date;

-- Application analytics indexes
DROP INDEX IF EXISTS idx_application_analytics_application_id;

-- User roles indexes
DROP INDEX IF EXISTS idx_user_roles_role;
