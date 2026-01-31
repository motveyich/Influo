/*
  # Fix platform_events enum to support all event types

  1. Changes
    - Add missing event types to event_type enum
    - Add values: campaign_launch, achievement, contest, milestone, announcement, maintenance
    
  2. Notes
    - Existing values (webinar, workshop, conference, meetup, other) will remain
    - This allows the platform to use all defined event types
*/

-- Add missing enum values to event_type
DO $$ 
BEGIN
  -- Add campaign_launch if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'campaign_launch' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')) THEN
    ALTER TYPE event_type ADD VALUE 'campaign_launch';
  END IF;
  
  -- Add achievement if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'achievement' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')) THEN
    ALTER TYPE event_type ADD VALUE 'achievement';
  END IF;
  
  -- Add contest if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'contest' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')) THEN
    ALTER TYPE event_type ADD VALUE 'contest';
  END IF;
  
  -- Add milestone if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'milestone' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')) THEN
    ALTER TYPE event_type ADD VALUE 'milestone';
  END IF;
  
  -- Add announcement if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'announcement' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')) THEN
    ALTER TYPE event_type ADD VALUE 'announcement';
  END IF;
  
  -- Add maintenance if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'maintenance' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')) THEN
    ALTER TYPE event_type ADD VALUE 'maintenance';
  END IF;
END $$;