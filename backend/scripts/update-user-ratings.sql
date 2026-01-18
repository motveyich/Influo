-- Script to update all user ratings from existing reviews
-- This will populate the unified_account_info with averageRating, totalReviews, and completedDeals

DO $$
DECLARE
  user_record RECORD;
  rating_avg NUMERIC;
  review_count INTEGER;
  offers_count INTEGER;
  apps_count INTEGER;
  total_deals INTEGER;
  current_info JSONB;
  updated_info JSONB;
BEGIN
  -- Loop through all users who have received reviews
  FOR user_record IN
    SELECT DISTINCT reviewee_id
    FROM reviews
  LOOP
    -- Calculate average rating and total reviews
    SELECT
      COALESCE(AVG(rating), 0),
      COUNT(*)
    INTO rating_avg, review_count
    FROM reviews
    WHERE reviewee_id = user_record.reviewee_id;

    -- Count completed offers
    SELECT COUNT(*)
    INTO offers_count
    FROM offers
    WHERE (advertiser_id = user_record.reviewee_id OR influencer_id = user_record.reviewee_id)
      AND status = 'completed';

    -- Count completed applications
    SELECT COUNT(*)
    INTO apps_count
    FROM applications
    WHERE (applicant_id = user_record.reviewee_id OR target_id = user_record.reviewee_id)
      AND status = 'completed';

    -- Total completed deals
    total_deals := COALESCE(offers_count, 0) + COALESCE(apps_count, 0);

    -- Get current unified_account_info
    SELECT unified_account_info
    INTO current_info
    FROM user_profiles
    WHERE user_id = user_record.reviewee_id;

    -- Build updated info
    updated_info := COALESCE(current_info, '{}'::jsonb) ||
      jsonb_build_object(
        'averageRating', ROUND(rating_avg::numeric, 1),
        'totalReviews', review_count,
        'completedDeals', total_deals
      );

    -- Update the profile
    UPDATE user_profiles
    SET unified_account_info = updated_info
    WHERE user_id = user_record.reviewee_id;

    RAISE NOTICE 'Updated user %: rating=%, reviews=%, deals=%',
      user_record.reviewee_id,
      ROUND(rating_avg::numeric, 1),
      review_count,
      total_deals;
  END LOOP;

  RAISE NOTICE 'Completed updating user ratings';
END $$;
