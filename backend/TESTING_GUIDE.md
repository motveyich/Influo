# Testing Guide

## Overview
Comprehensive guide for testing the Influo backend API.

## Test Structure

### Unit Tests
Located in `*.spec.ts` files next to the source files.

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### Test Example - AuthService

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should create user successfully', async () => {
    // Test implementation
  });
});
```

## Integration Tests

### Setup
```bash
# Run integration tests
npm run test:e2e
```

### Example - Auth Flow
```typescript
describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/signup (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
        userType: 'influencer'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');
      });
  });
});
```

## API Testing with Swagger

### Access Swagger UI
1. Start the server: `npm run start:dev`
2. Navigate to: `http://localhost:3000/api/docs`
3. Click "Authorize" and enter JWT token
4. Test endpoints interactively

## Manual Testing with cURL

### Authentication
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "fullName": "Test User",
    "userType": "influencer"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Use token in subsequent requests
TOKEN="your-jwt-token"
curl -X GET http://localhost:3000/api/profiles/me \
  -H "Authorization: Bearer $TOKEN"
```

## Testing Checklist

### Authentication
- [ ] User signup with valid data
- [ ] User signup with duplicate email
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token refresh
- [ ] Logout

### Authorization
- [ ] Access protected endpoint without token
- [ ] Access with expired token
- [ ] Access with invalid token
- [ ] Role-based access (influencer vs advertiser)
- [ ] Owner-only operations

### Business Logic
- [ ] Create influencer card (influencer only)
- [ ] Create advertiser card (advertiser only)
- [ ] Submit application
- [ ] Accept/decline application
- [ ] Create offer
- [ ] Update offer status
- [ ] Submit review
- [ ] Payment request workflow

### Data Validation
- [ ] Required fields validation
- [ ] Email format validation
- [ ] Password strength validation
- [ ] Enum validation (status, platform, etc.)
- [ ] Date validation
- [ ] Numeric range validation

### Error Handling
- [ ] 400 Bad Request (validation errors)
- [ ] 401 Unauthorized (missing/invalid token)
- [ ] 403 Forbidden (insufficient permissions)
- [ ] 404 Not Found (resource not found)
- [ ] 409 Conflict (duplicate resources)
- [ ] 500 Internal Server Error

## Performance Testing

### Load Testing with Artillery
```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Login flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "Password123!"
```

Run: `artillery run artillery.yml`

## Security Testing

### JWT Token Testing
- [ ] Token expiration
- [ ] Token tampering detection
- [ ] Token refresh mechanism
- [ ] Logout invalidation

### SQL Injection
- [ ] Test with malicious input in search queries
- [ ] Test with SQL commands in text fields
- [ ] Verify Supabase ORM protection

### XSS Protection
- [ ] Test with script tags in text fields
- [ ] Verify HTML sanitization
- [ ] Check response headers

### Rate Limiting
- [ ] Exceed rate limit threshold
- [ ] Verify 429 Too Many Requests response
- [ ] Test rate limit reset

## Database Testing

### RLS Policies
```sql
-- Test as different users
SET request.jwt.claim.sub = 'user-id-1';
SELECT * FROM user_profiles;
-- Should only see own profile

SET request.jwt.claim.sub = 'user-id-2';
SELECT * FROM user_profiles;
-- Should only see own profile
```

### Data Integrity
- [ ] Foreign key constraints
- [ ] Unique constraints
- [ ] Check constraints
- [ ] Trigger execution
- [ ] Default values

## Coverage Goals

- **Unit Tests:** > 80% coverage
- **Integration Tests:** All critical flows
- **E2E Tests:** Complete user journeys

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:cov
      - run: npm run test:e2e
```

## Debugging Tests

### VSCode Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Reset state after each test
3. **Mocking**: Mock external services (Supabase)
4. **Assertions**: Use specific assertions
5. **Coverage**: Aim for high coverage but focus on critical paths
6. **Performance**: Keep tests fast
7. **Documentation**: Comment complex test scenarios

## Common Issues

### Issue: Tests fail with database connection errors
**Solution**: Use mocked Supabase service in unit tests

### Issue: Timeouts in integration tests
**Solution**: Increase timeout or optimize slow operations

### Issue: Flaky tests
**Solution**: Ensure proper cleanup and avoid race conditions

## Resources

- [NestJS Testing Docs](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
