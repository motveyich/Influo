# Payment Access Fix - Role-Based Permissions

## Problem
The payment request system was incorrectly restricting status updates to only the creator (influencer). This prevented advertisers from updating payment statuses like "paying", "paid", or "failed", resulting in 403 Forbidden errors.

## Solution
Implemented role-based access control that allows both participants (advertiser and influencer) to manage payment requests based on their role in the collaboration.

## Changes Made

### 1. Updated `updateStatus` Method
**File:** `backend/src/modules/payments/payments.service.ts`

**Previous Logic:**
- Only checked if `payment.created_by === userId`
- Prevented advertisers from updating payment statuses

**New Logic:**
- Loads associated offer to determine user role
- Verifies user is a participant (advertiser or influencer)
- Applies role-specific status transition rules

### 2. Role-Based Status Transitions

**Influencer (Payment Recipient) Can:**
- `draft` → `pending` (send payment request)
- `draft/pending/paying/paid/failed` → `cancelled` (cancel at any time)
- `paid` → `confirmed` (confirm payment received)

**Advertiser (Payment Sender) Can:**
- `pending` → `paying` (start payment process)
- `pending` → `failed` (decline payment)
- `paying` → `paid` (mark as paid)
- `paying` → `failed` (report payment issue)
- `failed` → `pending` (retry payment)
- Any status → `cancelled` (cancel payment)

### 3. Updated `findOne` Method
**Previous:** Only creator could view payment request
**New:** Both offer participants can view payment request

## Testing
The fix allows:
1. ✅ Advertiser can view payment windows created by influencer
2. ✅ Advertiser can update status from "pending" to "paying"
3. ✅ Advertiser can update status from "paying" to "paid"
4. ✅ Advertiser can decline payment (pending → failed)
5. ✅ Influencer can confirm received payment (paid → confirmed)
6. ✅ Both parties can cancel at appropriate stages

## Security
- Both participants must be part of the offer (checked via advertiser_id/influencer_id)
- Status transitions are validated based on user role
- Invalid transitions return clear error messages with role context
- No unauthorized access to payment requests from non-participants
