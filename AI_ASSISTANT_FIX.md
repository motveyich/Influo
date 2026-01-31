# AI Assistant Errors - Fixed

## Problem 1: 400 Bad Request Error
AI Assistant was returning 400 Bad Request error due to validation issues in the DTO.

### Root Cause
The `userId` field in `DeepSeekRequestDto` was marked as required (`@IsString()` without `@IsOptional()`), but it's populated on the backend from the JWT token via `@CurrentUser()` decorator. The validation happens BEFORE the controller can set this field, causing the request to fail.

### Solution
Made `userId` optional in the DTO by adding `@IsOptional()` decorator:

```typescript
@IsString()
@IsOptional()
userId?: string;
```

## Problem 2: TypeScript Build Error
Build was failing with error: `Argument of type 'DealStage | undefined' is not assignable to parameter of type 'DealStage'`

### Root Cause
The `dto.dealStage` field is optional and can be `undefined`, but methods `getMessageLimit()` and `getStageContext()` expected a non-nullable `DealStage` value.

### Solution
Added default value using nullish coalescing operator:

```typescript
const dealStage = dto.dealStage ?? DealStage.UNKNOWN;
```

Applied in two places:
1. `buildPrompt()` method
2. `generateCacheKey()` method

## Files Changed
- `backend/src/modules/ai-assistant/dto/deepseek-request.dto.ts`
- `backend/src/modules/ai-assistant/ai-assistant.service.ts`

## How It Works Now
1. Frontend sends request WITHOUT `userId`
2. Backend validates the DTO (passes because `userId` is optional)
3. Controller extracts user from JWT via `@CurrentUser()`
4. Controller sets `dto.userId = user.id`
5. Service processes the request with the correct userId

## Testing
After the backend restarts (in dev mode with hot reload), the AI Assistant should work correctly.

If running in production:
1. Rebuild backend: `cd backend && npm run build`
2. Restart backend service
3. Test AI Assistant in the chat

## Additional Notes
- All AI request types are now supported: summary, risks, improve_message, suggest_reply, suggest_next_steps, check_message, suggest_first_message, checklist, formulate_neutral, review_help
- Deal stages are automatically determined based on offer status
- Token optimization is in place for different request types
