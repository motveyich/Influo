/*
  # Add Missing Foreign Key Indexes
  
  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - This improves JOIN performance and query optimization
    
  2. Tables Affected
    - ai_chat_threads
    - campaigns
    - collaboration_forms
    - content_filters
    - content_reports
    - deals
    - influencer_cards
    - offer_status_history
    - offers
    - payment_requests
    - payment_status_history
    - payment_windows
    - user_profiles
    - user_roles
*/

-- ai_chat_threads
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_user2_id ON ai_chat_threads(user2_id);

-- campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_deleted_by ON campaigns(deleted_by);

-- collaboration_forms
CREATE INDEX IF NOT EXISTS idx_collaboration_forms_linked_campaign ON collaboration_forms(linked_campaign);
CREATE INDEX IF NOT EXISTS idx_collaboration_forms_receiver_id ON collaboration_forms(receiver_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_forms_sender_id ON collaboration_forms(sender_id);

-- content_filters
CREATE INDEX IF NOT EXISTS idx_content_filters_created_by ON content_filters(created_by);

-- content_reports
CREATE INDEX IF NOT EXISTS idx_content_reports_reviewed_by ON content_reports(reviewed_by);

-- deals
CREATE INDEX IF NOT EXISTS idx_deals_application_id ON deals(application_id);
CREATE INDEX IF NOT EXISTS idx_deals_offer_id ON deals(offer_id);

-- influencer_cards
CREATE INDEX IF NOT EXISTS idx_influencer_cards_deleted_by ON influencer_cards(deleted_by);

-- offer_status_history
CREATE INDEX IF NOT EXISTS idx_offer_status_history_changed_by ON offer_status_history(changed_by);

-- offers
CREATE INDEX IF NOT EXISTS idx_offers_influencer_card_id ON offers(influencer_card_id);

-- payment_requests
CREATE INDEX IF NOT EXISTS idx_payment_requests_confirmed_by ON payment_requests(confirmed_by);

-- payment_status_history
CREATE INDEX IF NOT EXISTS idx_payment_status_history_changed_by ON payment_status_history(changed_by);

-- payment_windows
CREATE INDEX IF NOT EXISTS idx_payment_windows_application_id ON payment_windows(application_id);

-- user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_by ON user_profiles(deleted_by);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON user_roles(assigned_by);
