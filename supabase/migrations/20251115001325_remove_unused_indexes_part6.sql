/*
  # Remove Unused Indexes - Part 6 (Final)
  
  1. Performance Improvements
    - Drop remaining unused indexes
    
  2. Indexes Removed (Part 6)
    - Status history indexes
    - AI chat indexes
    - Deals indexes
    - Reviews indexes
    - Payment confirmations indexes
    - User settings indexes
*/

-- Offer status history indexes
DROP INDEX IF EXISTS idx_offer_status_history_created_at;

-- Payment status history indexes
DROP INDEX IF EXISTS idx_payment_status_history_created_at;

-- AI chat messages indexes
DROP INDEX IF EXISTS idx_ai_chat_messages_type;
DROP INDEX IF EXISTS idx_ai_chat_messages_created_at;

-- AI chat threads indexes
DROP INDEX IF EXISTS idx_ai_chat_threads_conversation_id;
DROP INDEX IF EXISTS idx_ai_chat_threads_users;

-- Deals indexes
DROP INDEX IF EXISTS idx_deals_status;
DROP INDEX IF EXISTS idx_deals_created_at;

-- Reviews indexes
DROP INDEX IF EXISTS idx_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_reviews_rating;

-- Payment confirmations indexes
DROP INDEX IF EXISTS idx_payment_confirmations_deal_id;
DROP INDEX IF EXISTS idx_payment_confirmations_confirmed_by;

-- User settings indexes
DROP INDEX IF EXISTS idx_user_settings_user_id;
DROP INDEX IF EXISTS idx_user_settings_updated_at;
