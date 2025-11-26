# Influo Backend API

NestJS backend for the Influo influencer-advertiser collaboration platform.

## Features

- JWT-based authentication with Supabase
- RESTful API architecture
- Swagger API documentation
- Global validation and transformation
- Error handling and logging
- Rate limiting
- CORS support
- Security headers with Helmet

## Tech Stack

- **Framework**: NestJS 10
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Passport
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase project

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Application
NODE_ENV=development
PORT=3001
API_PREFIX=api
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=3600
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRATION=604800

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### Development

```bash
# Start development server
npm run start:dev

# Build
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test

# Run tests with coverage
npm run test:cov
```

### API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:3001/api/docs`
- Health check: `http://localhost:3001/api`

## Project Structure

```
backend/
├── src/
│   ├── common/              # Shared components
│   │   ├── decorators/      # Custom decorators
│   │   ├── guards/          # Auth guards
│   │   ├── interceptors/    # Response interceptors
│   │   ├── filters/         # Exception filters
│   │   └── pipes/           # Validation pipes
│   ├── config/              # Configuration
│   ├── modules/             # Feature modules
│   │   └── auth/            # Authentication module
│   ├── shared/              # Shared services
│   │   └── supabase/        # Supabase integration
│   ├── app.module.ts        # Root module
│   ├── app.controller.ts    # Root controller
│   ├── app.service.ts       # Root service
│   └── main.ts              # Application entry point
├── test/                    # Tests
├── vercel.json              # Vercel configuration
├── nest-cli.json            # NestJS CLI configuration
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Health
- `GET /api` - Basic health check
- `GET /api/health` - Detailed health check

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
# Build the project first
npm run build

# Deploy to Vercel
vercel --prod
```

4. Set environment variables in Vercel Dashboard:
   - Go to your project settings
   - Add all required environment variables from `.env.example`

### Environment Variables in Vercel

Make sure to add these in Vercel Dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRATION`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRATION`
- `FRONTEND_URL`

## Security

- JWT tokens with expiration
- Password hashing with bcrypt
- Helmet for security headers
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention through Supabase ORM

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

MIT
