# Influo MVP Platform

A comprehensive influencer-advertiser collaboration platform built with React, TypeScript, and Tailwind CSS.

## Features

### Core Modules
- **Profiles**: Browse and discover influencers and advertisers
- **Campaigns**: Create and manage brand collaboration campaigns
- **Chat**: Real-time messaging between users
- **Offers**: Handle collaboration proposals and negotiations
- **Analytics**: Track performance and engagement metrics

### Key Capabilities
- **Modular Architecture**: Clean separation of concerns with feature-based modules
- **Real-time Communication**: Live chat and offer notifications
- **Analytics Integration**: Google Analytics with fallback to local storage
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript implementation

## Architecture

```
src/
├── core/                   # Core utilities and services
│   ├── types.ts           # TypeScript definitions
│   ├── config.ts          # App configuration
│   ├── database.ts        # Database stub
│   ├── analytics.ts       # Analytics service
│   └── realtime.ts        # Real-time service
├── modules/               # Feature modules
│   ├── profiles/          # User profiles management
│   ├── campaigns/         # Campaign management
│   ├── chat/             # Real-time messaging
│   ├── offers/           # Collaboration offers
│   └── analytics/        # Analytics dashboard
├── components/           # Shared components
│   └── Layout.tsx        # Main app layout
└── App.tsx              # Root component
```

## Setup

### Prerequisites
- Node.js 18+

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

## Development

### Adding New Modules
1. Create module directory in `src/modules/`
2. Add components, types, and services
3. Update routing in `App.tsx`
4. Add navigation in `Layout.tsx`

### Analytics Events
```typescript
// Track custom events
analytics.track('custom_event', {
  property1: 'value1',
  property2: 'value2'
});
```

## Deployment

The app is ready for deployment:

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## Contributing

1. Follow the modular architecture
2. Maintain TypeScript strict mode
3. Add proper error handling
4. Include analytics tracking for user actions
5. Follow the established naming conventions

## Mobile Support

- Responsive design with mobile-first approach
- Touch-friendly interface elements
- Optimized performance for mobile devices
- Progressive Web App (PWA) ready

## Security

- Input validation and sanitization
- Secure authentication patterns
- HTTPS-only cookies and secure headers

## Performance

- Code splitting by modules
- Lazy loading where appropriate
- Optimized build configuration

---

Built with React, TypeScript, and Tailwind CSS.
