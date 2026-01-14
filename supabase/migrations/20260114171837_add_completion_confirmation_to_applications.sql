/*
  # Add completion confirmation mechanism to applications

  1. Changes
    - Add 'pending_completion' and 'terminated' statuses to applications status check
    - Add 'completion_initiated_by' field to track who initiated completion
    - Add 'completion_requested_at' field to track when completion was requested
  
  2. Purpose
    - Enable two-party confirmation for collaboration completion
    - Prevent one-sided completion of applications
    - Track completion workflow

  3. Workflow
    - When user clicks "Complete", status changes to 'pending_completion'
    - Opposite party sees "Confirm" and "Reject" buttons
    - Only after confirmation, status changes to 'completed'
    - If rejected, status returns to 'in_progress'
*/

-- Add new fields to applications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'completion_initiated_by'
  ) THEN
    ALTER TABLE applications ADD COLUMN completion_initiated_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'completion_requested_at'
  ) THEN
    ALTER TABLE applications ADD COLUMN completion_requested_at timestamptz;
  END IF;
END $$;

-- Update status constraint to include new statuses
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('sent', 'accepted', 'declined', 'in_progress', 'pending_completion', 'completed', 'cancelled', 'terminated'));

-- Create index for completion_initiated_by for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_completion_initiated_by ON applications(completion_initiated_by);

-- Create index for pending_completion status for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_pending_completion ON applications(status) WHERE status = 'pending_completion';