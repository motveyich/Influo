# Applications Schema Fix - Complete

## Problem
The backend was using incorrect column names that didn't match the database schema:
- Backend used: `user_id`, `card_id`, `card_type`, `card_owner_id`
- Database has: `applicant_id`, `target_reference_id`, `target_type`, `target_id`

This caused a 409 Conflict error: "Could not find the 'card_id' column of 'applications' in the schema cache"

## Solution

### 1. Updated `applications.service.ts`

#### Column Mapping
- `user_id` → `applicant_id` (who sends the application)
- `card_id` → `target_reference_id` (the card ID)
- `card_type` → `target_type` (with conversion: `influencer` → `influencer_card`)
- `card_owner_id` → `target_id` (the card owner)

#### Status Mapping
- Changed from `pending` to `sent` (matching database constraints)

#### Data Storage
- Message is now stored in `application_data` jsonb field: `{ message: "text" }`
- Not as a direct column (which doesn't exist)

### 2. Added Rate Limiting
- Check if user already applied to this card within 1 hour
- Uses `is_rate_limited()` database function with card-specific checking
- Records interaction in `rate_limit_interactions` table after successful application

### 3. Updated Transform Method
- Converts database format back to API format
- `target_type: 'influencer_card'` → `cardType: 'influencer'`
- Extracts message from `application_data.message`

### 4. Updated Query Methods
- `findAll()`: Uses `applicant_id` and `target_id` for filtering
- `updateStatus()`: Checks `target_id` for authorization
- Foreign key reference: `applications_applicant_id_fkey`

## Database Schema
```sql
CREATE TABLE applications (
  id uuid PRIMARY KEY,
  applicant_id uuid NOT NULL REFERENCES user_profiles(user_id),
  target_id uuid NOT NULL REFERENCES user_profiles(user_id),
  target_type text CHECK (target_type IN ('influencer_card', 'advertiser_card', 'campaign')),
  target_reference_id uuid NOT NULL,
  application_data jsonb DEFAULT '{}',
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  response_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Testing
To test the fix:
1. Navigate to "Карточки инфлюенсеров" page
2. Click "Откликнуться" on any card (not your own)
3. Fill in the application message
4. Submit the application
5. Should succeed without 409 error

## Files Modified
- `/backend/src/modules/applications/applications.service.ts`
