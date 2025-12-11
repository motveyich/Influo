/*
  # Remove Unused Indexes - Part 1
  
  1. Performance Improvements
    - Drop unused indexes to reduce storage and maintenance overhead
    - Keep only essential indexes that are actually used by queries
    
  2. Indexes Removed (Part 1)
    - Payment windows indexes (except foreign key indexes)
    - Support tickets and messages indexes
    - User profiles auxiliary indexes
    - Campaigns auxiliary indexes
*/

-- Payment windows indexes (keeping only the foreign key index we just added)
DROP INDEX IF EXISTS idx_payment_windows_payer_id;
DROP INDEX IF EXISTS idx_payment_windows_payee_id;
DROP INDEX IF EXISTS idx_payment_windows_created_at;
DROP INDEX IF EXISTS idx_payment_windows_deal_id;
DROP INDEX IF EXISTS idx_payment_windows_offer_id;

-- Support tickets indexes
DROP INDEX IF EXISTS idx_support_tickets_status;
DROP INDEX IF EXISTS idx_support_tickets_assigned_to;

-- Support messages indexes
DROP INDEX IF EXISTS idx_support_messages_sender_id;

-- User profiles indexes (keeping primary and commonly used ones)
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_user_profiles_user_type;
DROP INDEX IF EXISTS idx_user_profiles_username;

-- Campaigns indexes
DROP INDEX IF EXISTS idx_campaigns_advertiser_id;
DROP INDEX IF EXISTS idx_campaigns_status;
DROP INDEX IF EXISTS idx_campaigns_not_deleted;
