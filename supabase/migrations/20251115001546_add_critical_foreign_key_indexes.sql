/*
  # Add Critical Foreign Key Indexes
  
  1. Performance Improvements
    - Add indexes for frequently used foreign keys
    - Improves JOIN performance for core tables
    
  2. Indexes Added
    - Core user and content tables
    - Payment and transaction tables
    - Platform content tables
    - Support system tables
*/

-- Admin logs
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);

-- AI chat threads
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_user1_id ON ai_chat_threads(user1_id);

-- Analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

-- Application analytics
CREATE INDEX IF NOT EXISTS idx_application_analytics_application_id ON application_analytics(application_id);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON campaigns(advertiser_id);

-- Content reports
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports(reporter_id);

-- Influencer cards
CREATE INDEX IF NOT EXISTS idx_influencer_cards_user_id ON influencer_cards(user_id);

-- Moderation queue
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned_moderator ON moderation_queue(assigned_moderator);

-- Offers
CREATE INDEX IF NOT EXISTS idx_offers_campaign_id ON offers(campaign_id);

-- Payment confirmations
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_confirmed_by ON payment_confirmations(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_deal_id ON payment_confirmations(deal_id);

-- Payment requests
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_by ON payment_requests(created_by);

-- Payment windows
CREATE INDEX IF NOT EXISTS idx_payment_windows_deal_id ON payment_windows(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_offer_id ON payment_windows(offer_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_payee_id ON payment_windows(payee_id);
CREATE INDEX IF NOT EXISTS idx_payment_windows_payer_id ON payment_windows(payer_id);

-- Platform content
CREATE INDEX IF NOT EXISTS idx_platform_events_created_by ON platform_events(created_by);
CREATE INDEX IF NOT EXISTS idx_platform_news_created_by ON platform_news(created_by);
CREATE INDEX IF NOT EXISTS idx_platform_updates_created_by ON platform_updates(created_by);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Support system
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
