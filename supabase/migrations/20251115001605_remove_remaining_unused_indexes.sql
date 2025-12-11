/*
  # Remove Remaining Unused Indexes
  
  1. Performance Improvements
    - Drop indexes that are still unused after adding critical foreign key indexes
    - These are redundant or low-value indexes
    
  2. Indexes Removed
    - Secondary foreign key indexes that duplicate primary access patterns
    - Historical tracking indexes (changed_by, deleted_by)
    - Linking indexes that are rarely queried
*/

-- AI chat threads (user2_id is less frequently queried than user1_id)
DROP INDEX IF EXISTS idx_ai_chat_threads_user2_id;

-- Soft delete tracking (rarely used in queries)
DROP INDEX IF EXISTS idx_campaigns_deleted_by;
DROP INDEX IF EXISTS idx_influencer_cards_deleted_by;
DROP INDEX IF EXISTS idx_user_profiles_deleted_by;

-- Collaboration forms linking indexes
DROP INDEX IF EXISTS idx_collaboration_forms_linked_campaign;
DROP INDEX IF EXISTS idx_collaboration_forms_receiver_id;
DROP INDEX IF EXISTS idx_collaboration_forms_sender_id;

-- Content management secondary indexes
DROP INDEX IF EXISTS idx_content_filters_created_by;
DROP INDEX IF EXISTS idx_content_reports_reviewed_by;

-- Deals linking indexes (already covered by primary queries)
DROP INDEX IF EXISTS idx_deals_application_id;
DROP INDEX IF EXISTS idx_deals_offer_id;

-- Status history tracking (low query frequency)
DROP INDEX IF EXISTS idx_offer_status_history_changed_by;
DROP INDEX IF EXISTS idx_payment_status_history_changed_by;

-- Secondary linking indexes
DROP INDEX IF EXISTS idx_offers_influencer_card_id;
DROP INDEX IF EXISTS idx_payment_requests_confirmed_by;
DROP INDEX IF EXISTS idx_payment_windows_application_id;

-- Administrative tracking (low query frequency)
DROP INDEX IF EXISTS idx_user_roles_assigned_by;
