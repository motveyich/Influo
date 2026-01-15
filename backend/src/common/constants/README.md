# Platform and Content Type Constants

This directory contains shared constants used throughout the application to ensure consistency between frontend and backend.

## Single Source of Truth

**IMPORTANT**: This is the single source of truth for platforms and content types. All changes should be made here first.

## How to Add a New Platform

Follow these steps when adding a new platform:

### 1. Update Backend Constants

Edit `backend/src/common/constants/platforms.ts`:

```typescript
export enum Platform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  // ... existing platforms
  NEW_PLATFORM = 'new_platform',  // Add your new platform here (lowercase, snake_case)
}
```

Add the display name to `PLATFORM_LABELS`:

```typescript
export const PLATFORM_LABELS: Record<Platform, string> = {
  // ... existing labels
  [Platform.NEW_PLATFORM]: 'New Platform',  // Human-readable name
};
```

If it's a primary platform (shown by default in UI), add it to `PRIMARY_PLATFORMS`:

```typescript
export const PRIMARY_PLATFORMS = [
  Platform.INSTAGRAM,
  // ... existing platforms
  Platform.NEW_PLATFORM,  // Add here if it should be shown by default
];
```

### 2. Update Frontend Constants

Edit `src/core/constants.ts`:

```typescript
export const PLATFORMS = [
  'instagram',
  'youtube',
  // ... existing platforms
  'new_platform',  // Must match backend exactly (lowercase)
] as const;
```

Add the display name:

```typescript
export const PLATFORM_LABELS: Record<Platform, string> = {
  // ... existing labels
  new_platform: 'New Platform',
};
```

If it's a primary platform:

```typescript
export const PRIMARY_PLATFORMS: Platform[] = [
  'instagram',
  // ... existing platforms
  'new_platform',
];
```

### 3. Update Platform Utilities (Optional)

Edit `src/core/utils/platform-utils.ts` to add custom colors or icons:

```typescript
export function getPlatformColor(platform: Platform | string): string {
  const colors: Record<string, string> = {
    // ... existing colors
    new_platform: 'bg-custom-color',
  };
  return colors[platform] || 'bg-gray-500';
}
```

### 4. Update Database (If Needed)

If you need to update existing data in the database, create a migration to update platform values in existing records.

## How to Add a New Content Type

Follow similar steps in `backend/src/common/constants/content-types.ts`:

1. Add to `ContentType` enum
2. Add to `CONTENT_TYPE_LABELS`
3. Update `PLATFORM_CONTENT_TYPES` to specify which platforms support this content type

## Naming Conventions

- **Backend enum values**: `UPPERCASE_SNAKE_CASE`
- **Database/API values**: `lowercase_snake_case`
- **Frontend const arrays**: `'lowercase_snake_case'`
- **Display names**: `Title Case` or localized strings

## Validation

All DTOs automatically use these enums for validation. When you add a new platform:

1. It will automatically be available in all API endpoints
2. Validation will accept the new value
3. No need to update individual DTO files

## Important Notes

1. **Always use lowercase in database and API**: `'instagram'` not `'Instagram'`
2. **Keep backend and frontend in sync**: The values must match exactly
3. **Use formatPlatform() for display**: Never show raw values to users
4. **Test after adding**: Create a test campaign with the new platform

## Example: Adding TikTok

If TikTok wasn't in the system, here's what you'd do:

**Backend** (`platforms.ts`):
```typescript
export enum Platform {
  TIKTOK = 'tiktok',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.TIKTOK]: 'TikTok',
};
```

**Frontend** (`constants.ts`):
```typescript
export const PLATFORMS = ['tiktok'] as const;

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
};
```

**Usage in components**:
```typescript
import { formatPlatform } from '../core/utils/platform-utils';

// Display
<div>{formatPlatform('tiktok')}</div>  // Shows: "TikTok"

// Comparison
if (platform === 'tiktok') { ... }  // Always use lowercase
```

## Troubleshooting

**Error: "Bad Request" when creating campaign**
- Check that frontend is sending lowercase platform names
- Verify the platform exists in backend Platform enum
- Check browser console for the exact value being sent

**Platform not showing in UI**
- Verify it's in PRIMARY_PLATFORMS if it should be shown by default
- Check that formatPlatform() has an entry for it

**Validation error**
- Ensure the value matches exactly between frontend and backend
- Remember: backend expects lowercase snake_case
