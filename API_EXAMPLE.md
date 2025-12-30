# API Request Example

## Complete Flow Example: User Registration and Profile Update

This document demonstrates a complete successful request flow from frontend to backend to Supabase.

## 1. User Registration

### Frontend Component
File: `src/components/AuthModal.tsx`

```typescript
import { authService } from '../core/auth';

const handleSignUp = async (email: string, password: string) => {
  const { data, error } = await authService.signUp(email, password, 'influencer');

  if (error) {
    console.error('Registration failed:', error.message);
    return;
  }

  console.log('User registered:', data.user);
  console.log('Access token received:', data.accessToken);
};
```

### What Happens Behind the Scenes

**Step 1: Frontend calls auth service**
```typescript
// src/core/auth.ts
await apiClient.post<AuthResponse>('/auth/signup', {
  email: 'user@example.com',
  password: 'password123',
  userType: 'influencer'
});
```

**Step 2: API client makes HTTP request**
```typescript
// src/core/api.ts
fetch('http://localhost:3001/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    userType: 'influencer'
  })
});
```

**HTTP Request:**
```http
POST /api/auth/signup HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "userType": "influencer"
}
```

**Step 3: Backend receives and processes**
```typescript
// backend/src/modules/auth/auth.controller.ts
@Post('signup')
async signup(@Body() signupDto: SignupDto) {
  return this.authService.signup(signupDto);
}
```

**Step 4: Backend creates user in Supabase**
```typescript
// backend/src/modules/auth/auth.service.ts
const supabase = this.supabaseService.getAdminClient();

// Create auth user
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: signupDto.email,
  password: signupDto.password,
  email_confirm: true
});

// Create user profile
const { error: profileError } = await supabase
  .from('user_profiles')
  .insert({
    user_id: authData.user.id,
    email: signupDto.email,
    user_type: signupDto.userType
  });

// Generate JWT tokens
const accessToken = this.jwtService.sign({ userId: authData.user.id });
const refreshToken = this.jwtService.sign(
  { userId: authData.user.id },
  { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
);

return {
  user: {
    id: authData.user.id,
    email: authData.user.email,
    userType: signupDto.userType
  },
  accessToken,
  refreshToken
};
```

**HTTP Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "userType": "influencer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Step 5: Frontend receives and stores tokens**
```typescript
// src/core/auth.ts
apiClient.setAccessToken(response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
this.currentState = { user: response.user, loading: false };
```

## 2. Authenticated Request: Get Profile

### Frontend Component
File: `src/modules/profiles/services/profileService.ts` (after migration)

```typescript
import { apiClient } from '../../../core/api';

export const getProfile = async (userId: string) => {
  return await apiClient.get(`/profiles/${userId}`);
};
```

### Request Flow

**HTTP Request:**
```http
GET /api/profiles/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:3001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Processing:**
```typescript
// backend/src/modules/profiles/profiles.controller.ts
@Get(':id')
@UseGuards(JwtAuthGuard)
async findOne(@Param('id') id: string) {
  return this.profilesService.findOne(id);
}
```

```typescript
// backend/src/modules/profiles/profiles.service.ts
async findOne(userId: string) {
  const supabase = this.supabaseService.getAdminClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new NotFoundException('Profile not found');

  return data;
}
```

**HTTP Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "user_type": "influencer",
  "username": "cool_influencer",
  "full_name": "John Doe",
  "bio": "Travel blogger",
  "avatar_url": "https://...",
  "created_at": "2024-12-11T10:00:00Z"
}
```

## 3. Update Profile with File Upload

### Frontend Component
```typescript
import { apiClient } from '../../../core/api';

const updateProfile = async (userId: string, data: any) => {
  return await apiClient.patch(`/profiles/${userId}`, data);
};

const uploadAvatar = async (userId: string, file: File) => {
  return await apiClient.uploadFile(`/profiles/${userId}/avatar`, file);
};
```

### Upload Avatar Request

**HTTP Request:**
```http
POST /api/profiles/a1b2c3d4-e5f6-7890-abcd-ef1234567890/avatar HTTP/1.1
Host: localhost:3001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="avatar.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary...--
```

**Backend Processing:**
```typescript
// backend/src/modules/profiles/profiles.controller.ts
@Post(':id/avatar')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('file'))
async uploadAvatar(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  return this.profilesService.uploadAvatar(id, file);
}
```

```typescript
// backend/src/modules/profiles/profiles.service.ts
async uploadAvatar(userId: string, file: Express.Multer.File) {
  const supabase = this.supabaseService.getAdminClient();

  // Upload to Supabase Storage
  const fileName = `${userId}-${Date.now()}.${file.mimetype.split('/')[1]}`;
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('avatars')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });

  // Get public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from('avatars')
    .getPublicUrl(fileName);

  // Update profile
  await supabase
    .from('user_profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', userId);

  return { avatarUrl: publicUrl };
}
```

**HTTP Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "avatarUrl": "https://xxx.supabase.co/storage/v1/object/public/avatars/..."
}
```

## Network Tab View

When you open DevTools → Network tab, you should see:

### ✅ Correct Requests (to backend):
```
POST    localhost:3001/api/auth/signup         → 201 Created
POST    localhost:3001/api/auth/login          → 200 OK
GET     localhost:3001/api/auth/me             → 200 OK
GET     localhost:3001/api/profiles/xxx        → 200 OK
PATCH   localhost:3001/api/profiles/xxx        → 200 OK
POST    localhost:3001/api/profiles/xxx/avatar → 200 OK
GET     localhost:3001/api/influencer-cards    → 200 OK
```

### ❌ NO Requests Like This (direct to Supabase):
```
POST    xxx.supabase.co/rest/v1/user_profiles
GET     xxx.supabase.co/rest/v1/influencer_cards
PATCH   xxx.supabase.co/rest/v1/user_profiles
```

### ✅ Optional (Realtime subscriptions):
```
WSS     xxx.supabase.co/realtime/v1/websocket  → 101 Switching Protocols
```

## Testing with curl

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "userType": "influencer"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from response.

### Get Current User
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Profile
```bash
curl http://localhost:3001/api/profiles/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Profile
```bash
curl -X PATCH http://localhost:3001/api/profiles/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "bio": "Travel blogger"
  }'
```

## Summary

**Frontend Responsibilities:**
- User interface
- Form validation
- Calling apiClient methods
- Storing and managing JWT tokens
- Displaying data

**Backend Responsibilities:**
- Authentication (JWT generation)
- Authorization (checking permissions)
- Input validation
- Business logic
- Database operations (via Supabase with service role key)
- File uploads to storage
- Error handling

**Supabase Responsibilities:**
- Database storage
- Authentication provider
- File storage
- Realtime subscriptions (optional)

**Security Flow:**
1. Frontend never has direct database access
2. All requests go through authenticated backend
3. Backend uses service role key to bypass RLS when appropriate
4. JWT tokens ensure user identity
5. Backend enforces authorization rules
