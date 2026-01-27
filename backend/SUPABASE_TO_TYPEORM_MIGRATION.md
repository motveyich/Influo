# Supabase to TypeORM Migration Guide

## Migration Status: IN PROGRESS

This document tracks the complete migration from Supabase to TypeORM + PostgreSQL.

## Goal
Replace all 177 Supabase calls across 22 backend files with TypeORM database operations.

---

## ✅ Phase 1: Infrastructure Setup (COMPLETED)

### 1.1 Dependencies Installed
- ✅ TypeORM (`typeorm`)
- ✅ PostgreSQL driver (`pg`)
- ✅ Password hashing (`bcrypt`, `@types/bcrypt`)
- ✅ Class validation (`class-validator`, `class-transformer`)
- ✅ File uploads (`multer`, `@types/multer`)
- ✅ NestJS TypeORM integration (`@nestjs/typeorm`)

### 1.2 Entity Models Created (21 entities)
All database tables have been mapped to TypeORM entities:

- ✅ `user-profile.entity.ts` - User accounts and profiles
- ✅ `advertiser-card.entity.ts` - Advertiser campaign cards
- ✅ `influencer-card.entity.ts` - Influencer profile cards
- ✅ `auto-campaign.entity.ts` - Automatic campaigns
- ✅ `offer.entity.ts` - Collaboration offers
- ✅ `application.entity.ts` - Applications to campaigns
- ✅ `review.entity.ts` - User reviews and ratings
- ✅ `payment-request.entity.ts` - Payment requests
- ✅ `blacklist.entity.ts` - Blocked users
- ✅ `favorite.entity.ts` - Favorited cards
- ✅ `conversation.entity.ts` - Chat conversations
- ✅ `message.entity.ts` - Chat messages
- ✅ `user-settings.entity.ts` - User settings
- ✅ `rate-limit-interaction.entity.ts` - Rate limiting
- ✅ `user-role.entity.ts` - User role assignments
- ✅ `content-report.entity.ts` - Content reports
- ✅ `moderation-queue.entity.ts` - Moderation queue
- ✅ `admin-log.entity.ts` - Admin action logs
- ✅ `content-filter.entity.ts` - Content filters
- ✅ `support-ticket.entity.ts` - Support tickets
- ✅ `support-message.entity.ts` - Support messages

### 1.3 Database Configuration
- ✅ Created `database.module.ts` with TypeORM configuration
- ✅ Updated `app.module.ts` to use `DatabaseModule` instead of `SupabaseModule`
- ✅ Configured PostgreSQL connection via environment variables

---

## 🔄 Phase 2: Service Migration (IN PROGRESS)

Replace Supabase SDK calls with TypeORM repository operations in all service files.

### Migration Status by Service:

| Service File | Supabase Calls | Status | Notes |
|-------------|----------------|--------|-------|
| `auth.service.ts` | 6 | 🟡 Pending | Auth + password hashing |
| `profiles.service.ts` | 15 | 🟡 Pending | User profiles + avatar |
| `advertiser-cards.service.ts` | 7 | 🟡 Pending | Advertiser cards CRUD |
| `influencer-cards.service.ts` | 7 | 🟡 Pending | Influencer cards CRUD |
| `auto-campaigns.service.ts` | 20 | 🟡 Pending | Auto campaigns logic |
| `offers.service.ts` | 30 | 🟡 Pending | Complex offer management |
| `applications.service.ts` | 19 | 🟡 Pending | Applications + file upload |
| `payments.service.ts` | 10 | 🟡 Pending | Payment requests |
| `reviews.service.ts` | 15 | 🟡 Pending | Reviews + rating updates |
| `blacklist.service.ts` | 8 | 🟡 Pending | Blacklist management |
| `favorites.service.ts` | 8 | 🟡 Pending | Favorites CRUD |
| `chat.service.ts` | - | 🟡 Pending | Conversations + messages |
| `admin.service.ts` | 6 | 🟡 Pending | Admin operations |
| `moderation.service.ts` | 2 | 🟡 Pending | Content moderation |
| `support.service.ts` | - | 🟡 Pending | Support tickets |
| `roles.service.ts` | - | 🟡 Pending | Role management |
| `user-settings.service.ts` | - | 🟡 Pending | User settings CRUD |

**Total Progress: 0/177 Supabase calls replaced (0%)**

---

## 🚧 Phase 3: Storage Migration (PENDING)

Replace Supabase Storage with local/cloud file storage.

### Files Using Storage:
- `applications.service.ts` - Completion screenshots
- `profiles.service.ts` - User avatars
- `offers.service.ts` - Completion screenshots

### Storage Solution Options:
1. **Local Storage** (development) - Store files in `/uploads` directory
2. **AWS S3** (production) - Cloud object storage
3. **MinIO** (self-hosted) - S3-compatible object storage

### Implementation Plan:
- [ ] Create storage service abstraction
- [ ] Implement local file storage
- [ ] Add file upload/download endpoints
- [ ] Update services to use new storage
- [ ] Migrate existing files (if any)

---

## 🔧 Phase 4: Authentication Migration (PENDING)

Replace Supabase Auth with JWT-based authentication.

### Changes Required:
- [ ] Implement password hashing with bcrypt
- [ ] Create JWT token generation/validation
- [ ] Update `auth.service.ts` signup/login logic
- [ ] Remove `auth.uid()` references
- [ ] Update JWT strategy to extract user from token
- [ ] Implement refresh token mechanism
- [ ] Update password reset flow

---

## 📝 Phase 5: Configuration Updates (PENDING)

### Environment Variables to Update:

Remove Supabase variables:
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Add PostgreSQL variables:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=influo_db
DB_SSL=false
```

Add storage variables:
```
STORAGE_TYPE=local  # or 's3' or 'minio'
STORAGE_LOCAL_PATH=./uploads
# For S3:
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=
```

---

## 🧪 Phase 6: Testing & Verification (PENDING)

- [ ] Run build: `npm run build`
- [ ] Fix any TypeScript errors
- [ ] Test authentication flow
- [ ] Test each API endpoint
- [ ] Verify file uploads work
- [ ] Check database queries performance
- [ ] Run `grep -r "supabase" src/` - should return 0 results
- [ ] Update API documentation

---

## 🗑️ Phase 7: Cleanup (PENDING)

- [ ] Remove `src/shared/supabase/` directory
- [ ] Uninstall `@supabase/supabase-js` package
- [ ] Remove Supabase-related imports
- [ ] Delete migration documentation files
- [ ] Update README with new setup instructions

---

## Key Migration Patterns

### Pattern 1: Simple SELECT Query
**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)
  .single();
```

**After (TypeORM):**
```typescript
const data = await this.repository.findOne({
  where: { id },
});
```

### Pattern 2: INSERT Operation
**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert(insertData)
  .select()
  .single();
```

**After (TypeORM):**
```typescript
const entity = this.repository.create(insertData);
const data = await this.repository.save(entity);
```

### Pattern 3: UPDATE Operation
**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('table_name')
  .update(updateData)
  .eq('id', id)
  .select()
  .single();
```

**After (TypeORM):**
```typescript
await this.repository.update({ id }, updateData);
const data = await this.repository.findOne({ where: { id } });
```

### Pattern 4: DELETE Operation
**Before (Supabase):**
```typescript
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);
```

**After (TypeORM):**
```typescript
await this.repository.delete({ id });
```

### Pattern 5: File Upload (Storage)
**Before (Supabase):**
```typescript
const { error: uploadError } = await supabase.storage
  .from('bucket_name')
  .upload(filePath, file);
```

**After (Local Storage):**
```typescript
import * as fs from 'fs/promises';
await fs.writeFile(filePath, file.buffer);
```

---

## Next Steps

1. Begin with `auth.service.ts` - most critical for application functionality
2. Continue with simpler services (`blacklist`, `favorites`)
3. Progress to complex services (`offers`, `auto-campaigns`)
4. Implement file storage solution
5. Run comprehensive tests
6. Final cleanup and verification

---

## Estimated Effort

- **Phase 2 (Service Migration)**: ~177 replacements across 22 files = **8-12 hours**
- **Phase 3 (Storage Migration)**: ~2-3 hours
- **Phase 4 (Auth Migration)**: ~2-3 hours
- **Phase 5 (Configuration)**: ~1 hour
- **Phase 6 (Testing)**: ~3-4 hours
- **Phase 7 (Cleanup)**: ~1 hour

**Total Estimated Time: 17-26 hours of focused development work**

---

## Migration started: 2026-01-27
## Target completion: TBD
