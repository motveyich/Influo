/*
  # Update Privacy Settings Defaults
  
  Updates the default values for privacy settings:
  - hideEmail: false -> true (email hidden by default)
  - hidePhone: false -> true (phone hidden by default)
  - Other privacy settings remain unchanged
*/

-- Update the default value for privacy column
ALTER TABLE user_settings 
ALTER COLUMN privacy SET DEFAULT '{
  "hideEmail": true, 
  "hidePhone": true, 
  "hideSocialMedia": false, 
  "profileVisibility": "public"
}'::jsonb;

-- Update existing records to have email and phone hidden by default (only if they haven't been modified)
UPDATE user_settings
SET privacy = jsonb_set(
  jsonb_set(
    privacy,
    '{hideEmail}',
    'true'
  ),
  '{hidePhone}',
  'true'
)
WHERE 
  (privacy->>'hideEmail')::boolean = false 
  AND (privacy->>'hidePhone')::boolean = false;