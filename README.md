# Influo MVP Platform

A comprehensive influencer-advertiser collaboration platform built with React, TypeScript, Tailwind CSS, and Bolt Database.

> **Built for Bolt.new** - This project uses Bolt.new's built-in database (Bolt Database). Make sure to configure your database credentials from the Bolt.new Project Settings.

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
- **Database**: Built-in Bolt Database with Row Level Security (RLS)

## Architecture

```
src/
├── core/                   # Core utilities and services
│   ├── types.ts           # TypeScript definitions
│   ├── config.ts          # App configuration
│   ├── database.ts        # Database client
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

2. **Set up Bolt Database**
   - This project uses **Bolt.new's built-in database**
   - Open the **Bolt Database** panel in Bolt.new (right side of the interface)
   - Navigate to **Project Settings → Database** or **Connection Info**
   - Copy your Bolt Database URL and Anon Key
   - The database schema is already created automatically

3. **Environment Variables**
   **IMPORTANT**: Update the `.env` file with your Bolt Database credentials:

   ```bash
   # Open .env file and replace these values:
   VITE_DATABASE_URL=https://your-bolt-project-id.database.co
   VITE_DATABASE_KEY=your_bolt_database_anon_key
   ```

   - In Bolt.new: Click **Settings** → **Database** → **Connection Info**
   - Or check the **Bolt Database** panel → **Settings/Secrets**

4. **Start development server**
   ```bash
   npm run dev
   ```

## Troubleshooting

### "Failed to fetch" errors
If you see "Failed to fetch" errors in the browser console:

1. **Check your `.env` file**: Make sure `VITE_DATABASE_URL` and `VITE_DATABASE_KEY` are set with your actual **Bolt Database** credentials (NOT placeholder values!)
2. **Get credentials from Bolt.new**: Open **Project Settings → Database → Connection Info** and copy the correct URL and Anon Key
3. **Verify Bolt Database is active**: Check the **Bolt Database** panel to ensure tables are visible and accessible
4. **Restart the development server**: After updating `.env`, restart with `npm run dev`
5. **Check the browser console**: Look for detailed error messages about the connection

## Database Schema

### Core Tables
- `user_profiles` - User account information
- `influencer_cards` - Influencer portfolio details
- `campaigns` - Brand collaboration campaigns
- `collaboration_forms` - Campaign applications
- `chat_messages` - Real-time messages
- `offers` - Collaboration proposals
- `analytics_events` - Event tracking

### Security
- Row Level Security (RLS) enabled on all tables
- Authenticated user policies
- Cross-user interaction policies for messaging and offers

## Key Features

### Real-time Features
- **Live Chat**: Instant messaging with online status
- **Offer Notifications**: Real-time updates on proposal status
- **Connection Monitoring**: Automatic reconnection and offline handling

### Analytics
- **Event Tracking**: Campaign creation, offers, messages, profile views
- **Fallback Handling**: Local storage when analytics service is offline
- **Performance Metrics**: Response times, acceptance rates, completion rates

### Error Handling
- **Graceful Degradation**: Offline functionality where possible
- **Retry Logic**: Automatic retry for failed operations
- **User Feedback**: Toast notifications for all actions

## Development

### Adding New Modules
1. Create module directory in `src/modules/`
2. Add components, types, and services
3. Update routing in `App.tsx`
4. Add navigation in `Layout.tsx`

### Database Changes
- Use the Bolt Database migration tools
- Follow naming convention: `feature_description.sql`
- Include RLS policies and proper indexing

### Analytics Events
```typescript
// Track custom events
analytics.track('custom_event', {
  property1: 'value1',
  property2: 'value2'
});
```

## Deployment

The app is ready for deployment to Netlify:

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

- Row Level Security on all database tables
- Input validation and sanitization
- Secure authentication with built-in Auth
- HTTPS-only cookies and secure headers

## Performance

- Code splitting by modules
- Lazy loading where appropriate
- Optimized database queries with proper indexing
- Real-time subscriptions with connection pooling

---

Built with React, TypeScript, Tailwind CSS, and Bolt Database.
