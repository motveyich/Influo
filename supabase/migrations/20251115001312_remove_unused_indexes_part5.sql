/*
  # Remove Unused Indexes - Part 5
  
  1. Performance Improvements
    - Continue dropping unused indexes
    
  2. Indexes Removed (Part 5)
    - Content reports indexes
    - Moderation queue indexes
    - Admin logs indexes
    - Content filters indexes
*/

-- Content reports indexes
DROP INDEX IF EXISTS idx_content_reports_reporter;
DROP INDEX IF EXISTS idx_content_reports_target;
DROP INDEX IF EXISTS idx_content_reports_priority;

-- Moderation queue indexes
DROP INDEX IF EXISTS idx_moderation_queue_status;
DROP INDEX IF EXISTS idx_moderation_queue_content;
DROP INDEX IF EXISTS idx_moderation_queue_priority;
DROP INDEX IF EXISTS idx_moderation_queue_assigned;

-- Admin logs indexes
DROP INDEX IF EXISTS idx_admin_logs_admin;
DROP INDEX IF EXISTS idx_admin_logs_action;

-- Content filters indexes
DROP INDEX IF EXISTS idx_content_filters_active;
DROP INDEX IF EXISTS idx_content_filters_type;
