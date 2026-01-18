/*
  # Add Two-Way Completion Confirmation to Offers

  ## Changes
  
  1. New Columns
    - `completion_initiated_by` (uuid, nullable) - User who initiated completion request
    - `completion_requested_at` (timestamptz, nullable) - When completion was requested
  
  2. Status Constraint Update
    - Add 'pending_completion' to valid offer statuses
  
  3. Foreign Keys
    - Link `completion_initiated_by` to `user_profiles(user_id)`
  
  ## Purpose
  
  Implements two-way confirmation mechanism for offer completion:
  - First user requests completion -> status becomes 'pending_completion'
  - Second user confirms -> status becomes 'completed'
  - Second user rejects -> status returns to 'in_progress'
  
  This ensures both parties agree before an offer is marked as completed,
  preventing premature review creation.
*/

-- Add new columns to offers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'completion_initiated_by'
  ) THEN
    ALTER TABLE offers ADD COLUMN completion_initiated_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'completion_requested_at'
  ) THEN
    ALTER TABLE offers ADD COLUMN completion_requested_at timestamptz;
  END IF;
END $$;

-- Drop existing status constraint
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;

-- Add new status constraint including 'pending_completion'
ALTER TABLE offers ADD CONSTRAINT offers_status_check 
  CHECK (status IN (
    'pending',
    'accepted',
    'declined',
    'counter',
    'in_progress',
    'pending_completion',
    'completed',
    'cancelled',
    'terminated',
    'withdrawn',
    'expired'
  ));

-- Add foreign key for completion_initiated_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'offers_completion_initiated_by_fkey'
  ) THEN
    ALTER TABLE offers 
      ADD CONSTRAINT offers_completion_initiated_by_fkey 
      FOREIGN KEY (completion_initiated_by) 
      REFERENCES user_profiles(user_id);
  END IF;
END $$;

-- Update valid transitions for status history
COMMENT ON COLUMN offers.completion_initiated_by IS 'User who initiated the completion request';
COMMENT ON COLUMN offers.completion_requested_at IS 'Timestamp when completion was requested';