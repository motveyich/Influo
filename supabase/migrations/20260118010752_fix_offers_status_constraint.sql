/*
  # Fix offers status check constraint
  
  1. Problem
    - Current constraint only allows: pending, accepted, declined, counter, completed
    - Missing critical statuses: in_progress, terminated, cancelled, withdrawn, expired
    - This causes 409 errors when trying to update offer status to in_progress or terminated
  
  2. Changes
    - Drop existing incomplete constraint
    - Add new constraint with complete list of all valid statuses
  
  3. Valid Statuses
    - pending: Initial state, awaiting response
    - accepted: Offer accepted
    - declined: Offer declined
    - counter: Counter offer made
    - in_progress: Work has started (needed for "Start Work" action)
    - completed: Work completed
    - cancelled: Cancelled by user
    - terminated: Collaboration terminated (needed for "Terminate Collaboration" action)
    - withdrawn: Offer withdrawn
    - expired: Offer expired
*/

-- Drop the existing incomplete constraint
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;

-- Add new constraint with complete list of valid statuses
ALTER TABLE offers ADD CONSTRAINT offers_status_check 
  CHECK (status IN (
    'pending',
    'accepted', 
    'declined',
    'counter',
    'in_progress',
    'completed',
    'cancelled',
    'terminated',
    'withdrawn',
    'expired'
  ));