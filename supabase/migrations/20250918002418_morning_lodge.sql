/*
  # Create user settings table

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `security` (jsonb) - Security settings including 2FA, password history
      - `privacy` (jsonb) - Privacy settings for profile visibility
      - `notifications` (jsonb) - Email and push notification preferences
      - `interface` (jsonb) - Theme, language, font size, date/time format
      - `account` (jsonb) - Account status and deactivation info
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_settings` table
    - Add policy for users to manage their own settings
    - Add policy for admins to view all settings

  3. Indexes
    - Index on user_id for fast lookups
    - Index on updated_at for recent changes
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  security jsonb DEFAULT '{
    "twoFactorEnabled": false,
    "passwordLastChanged": "",
    "activeSessions": []
  }'::jsonb,
  privacy jsonb DEFAULT '{
    "hideEmail": false,
    "hidePhone": false,
    "hideSocialMedia": false,
    "profileVisibility": "public"
  }'::jsonb,
  notifications jsonb DEFAULT '{
    "email": {
      "applications": true,
      "messages": true,
      "payments": true,
      "reviews": true,
      "marketing": false
    },
    "push": {
      "enabled": true,
      "applications": true,
      "messages": true,
      "payments": true,
      "reviews": true
    },
    "frequency": "immediate",
    "soundEnabled": true
  }'::jsonb,
  interface jsonb DEFAULT '{
    "theme": "light",
    "language": "ru",
    "fontSize": "medium",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "24h",
    "timezone": "Europe/Moscow"
  }'::jsonb,
  account jsonb DEFAULT '{
    "isActive": true,
    "isDeactivated": false
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all settings (read-only)
CREATE POLICY "Admins can view all settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
      AND user_profiles.is_deleted = false
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at_trigger
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();