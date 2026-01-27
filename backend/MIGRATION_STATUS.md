# Supabase to TypeORM Migration - Current Status

## 📊 Overall Progress: 8/177 Supabase Calls Replaced (4.5%)

---

## ✅ Completed Work

### 1. Infrastructure Setup (100% Complete)
- ✅ Installed all required dependencies (TypeORM, PostgreSQL driver, bcrypt, etc.)
- ✅ Created 21 TypeORM entity models mapping all database tables
- ✅ Set up `DatabaseModule` with PostgreSQL configuration
- ✅ Updated `app.module.ts` to use TypeORM instead of Supabase
- ✅ Created comprehensive migration guide document

### 2. Service Migration (1/22 Complete)
- ✅ **blacklist.service.ts** - Fully migrated (8/8 calls replaced)
  - All CRUD operations now use TypeORM repositories
  - Module updated to import TypeORM entities
  - Zero Supabase references remaining

---

## 🚧 Remaining Work

### Services Still Using Supabase (169 calls across 21 files):

| Service | Supabase Calls | Complexity | Priority |
|---------|---------------|------------|----------|
| **favorites.service.ts** | 8 | Low | High (simple CRUD) |
| **user-settings.service.ts** | ~5 | Low | High (simple CRUD) |
| **roles.service.ts** | ~3 | Low | Medium |
| **moderation.service.ts** | 2 | Low | Medium |
| **admin.service.ts** | 6 | Medium | Medium |
| **advertiser-cards.service.ts** | 7 | Medium | High |
| **influencer-cards.service.ts** | 7 | Medium | High |
| **support.service.ts** | ~5 | Medium | Medium |
| **profiles.service.ts** | 15 | High | **Critical** (+ file storage) |
| **auth.service.ts** | 6 | High | **Critical** (+ password hashing) |
| **reviews.service.ts** | 15 | High | High |
| **payments.service.ts** | 10 | High | High |
| **auto-campaigns.service.ts** | 20 | Very High | High |
| **offers.service.ts** | 30 | Very High | **Critical** (+ file storage) |
| **applications.service.ts** | 19 | Very High | High (+ file storage) |
| **chat.service.ts** | ~12 | High | High |

---

## 🎯 Critical Path Services

These services must be migrated first as they're essential for core functionality:

### 1. auth.service.ts (Priority: CRITICAL)
**Current State:** Uses Supabase Auth
**Required Changes:**
- Implement bcrypt password hashing
- Create JWT token generation/validation
- Replace `auth.uid()` with JWT-based user identification
- Update signup/login/refresh token logic

**Files to modify:**
- `auth.service.ts`
- `auth.module.ts`
- `jwt.strategy.ts`

### 2. profiles.service.ts (Priority: CRITICAL)
**Current State:** Uses Supabase database + storage
**Required Changes:**
- Replace all database queries with TypeORM
- Implement local/S3 file storage for avatars
- Update file upload/download logic

**Dependencies:** File storage system must be implemented first

### 3. offers.service.ts (Priority: CRITICAL)
**Current State:** 30 Supabase calls (most complex service)
**Required Changes:**
- Replace all database queries with TypeORM
- Handle complex joins and relations
- Implement file storage for completion screenshots

**Dependencies:** File storage system, TypeORM relations

---

## 📁 File Storage Migration

Three services require file storage replacement:

| Service | Storage Usage |
|---------|--------------|
| profiles.service.ts | User avatars |
| offers.service.ts | Completion screenshots |
| applications.service.ts | Completion screenshots |

**Storage Options:**
1. **Local Storage** (simplest, for development)
   - Store in `./uploads` directory
   - Serve via static file endpoint

2. **AWS S3** (production-ready)
   - Industry standard
   - Requires AWS credentials

3. **MinIO** (self-hosted alternative)
   - S3-compatible API
   - Full control over data

**Recommended Approach:** Start with local storage, then add S3 support

---

## 🔑 Environment Variables

Current Supabase variables (to be removed):
```env
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

New required variables:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=influo_db
DB_SSL=false

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d

# Storage (local)
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./uploads

# Storage (S3 - optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=us-east-1
```

---

## 📝 Next Steps (Recommended Order)

### Phase 1: Simple Services (Est. 3-4 hours)
1. ✅ blacklist.service.ts (completed)
2. favorites.service.ts
3. user-settings.service.ts
4. roles.service.ts
5. moderation.service.ts

### Phase 2: File Storage Setup (Est. 2-3 hours)
6. Create storage service abstraction
7. Implement local file storage
8. Add upload/download endpoints

### Phase 3: Critical Services (Est. 6-8 hours)
9. auth.service.ts (authentication + bcrypt)
10. profiles.service.ts (profiles + avatar uploads)
11. advertiser-cards.service.ts
12. influencer-cards.service.ts

### Phase 4: Complex Services (Est. 8-10 hours)
13. reviews.service.ts
14. payments.service.ts
15. chat.service.ts
16. support.service.ts
17. admin.service.ts

### Phase 5: Most Complex (Est. 8-10 hours)
18. offers.service.ts (30 calls)
19. auto-campaigns.service.ts (20 calls)
20. applications.service.ts (19 calls)

### Phase 6: Cleanup (Est. 2 hours)
21. Remove Supabase module and dependencies
22. Update `.env` files
23. Run build and fix any errors
24. Verify zero Supabase references
25. Update documentation

---

## 💡 Migration Pattern Example

The blacklist.service.ts migration demonstrates the standard pattern:

### Before (Supabase):
```typescript
constructor(private supabaseService: SupabaseService) {}

async findAll(userId: string) {
  const supabase = this.supabaseService.getAdminClient();
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .eq('blocker_id', userId);
  return data;
}
```

### After (TypeORM):
```typescript
constructor(
  @InjectRepository(Blacklist)
  private blacklistRepository: Repository<Blacklist>,
) {}

async findAll(userId: string) {
  const blacklists = await this.blacklistRepository.find({
    where: { blocker_id: userId },
    relations: ['blocked_user'],
    order: { created_at: 'DESC' },
  });
  return blacklists;
}
```

### Module Changes:
```typescript
// Before
imports: [SupabaseModule]

// After
imports: [TypeOrmModule.forFeature([Blacklist, UserProfile])]
```

---

## ⏱️ Estimated Remaining Time

- **Simple services (5 files):** 3-4 hours
- **File storage setup:** 2-3 hours
- **Critical services (4 files):** 6-8 hours
- **Complex services (6 files):** 8-10 hours
- **Most complex (3 files):** 8-10 hours
- **Testing & cleanup:** 2-3 hours

**Total Estimated Time: 29-38 hours of focused development work**

---

## 🎯 Success Criteria

Migration is complete when:
- [ ] All 177 Supabase calls replaced with TypeORM
- [ ] File storage system implemented and working
- [ ] `npm run build` completes without errors
- [ ] `grep -r "supabase" src/` returns 0 results (except comments/docs)
- [ ] All API endpoints tested and working
- [ ] Environment variables documented
- [ ] README updated with new setup instructions

---

## 📞 Questions/Decisions Needed

1. **Database Connection:** Do you have a PostgreSQL database ready?
   - If using Supabase PostgreSQL: Can connect directly with connection string
   - If need new database: Should we set up local PostgreSQL?

2. **File Storage:** Which storage solution should we implement?
   - Local storage (simplest for development)
   - AWS S3 (production-ready)
   - MinIO (self-hosted)

3. **Migration Approach:** Should we:
   - Complete all services systematically (recommended)
   - Focus on specific features first
   - Migrate in phases with testing between each

---

**Migration Started:** 2026-01-27
**Last Updated:** 2026-01-27
**Current Status:** Infrastructure complete, 1/22 services migrated
