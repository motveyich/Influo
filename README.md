# Influo MVP Platform

A comprehensive influencer-advertiser collaboration platform built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

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
- **Database**: Supabase with Row Level Security (RLS)

## 🏗️ Architecture

```
src/
├── core/                   # Core utilities and services
│   ├── types.ts           # TypeScript definitions
│   ├── config.ts          # App configuration
│   ├── supabase.ts        # Database client
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

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Supabase account

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Go to Settings > API in your Supabase dashboard
   - Copy your Project URL and anon/public key
   - The database schema will be automatically created

3. **Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   **Open the `.env` file and update it with your actual Supabase credentials:**
   ```bash
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
   
   ⚠️ **Important**: Make sure to replace the placeholder values with your actual Supabase project URL and anonymous key!

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Troubleshooting

### "Failed to fetch" errors
If you see "Failed to fetch" errors in the browser console:

1. **Check your `.env` file**: Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set with your actual Supabase credentials
2. **Verify your Supabase project**: Ensure your Supabase project is active and accessible
3. **Restart the development server**: After updating `.env`, restart with `npm run dev`
4. **Check the browser console**: Look for detailed error messages about the connection

## 📊 Database Schema

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

## 🎯 Key Features

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

## 🔧 Development

### Adding New Modules
1. Create module directory in `src/modules/`
2. Add components, types, and services
3. Update routing in `App.tsx`
4. Add navigation in `Layout.tsx`

### Database Changes
- Create new migration files in `supabase/migrations/`
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

## 🚀 Deployment

The app is ready for deployment to Netlify:

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## 🤝 Contributing

1. Follow the modular architecture
2. Maintain TypeScript strict mode
3. Add proper error handling
4. Include analytics tracking for user actions
5. Follow the established naming conventions

## 📱 Mobile Support

- Responsive design with mobile-first approach
- Touch-friendly interface elements
- Optimized performance for mobile devices
- Progressive Web App (PWA) ready

## 🔒 Security

- Row Level Security on all database tables
- Input validation and sanitization
- Secure authentication with Supabase Auth
- HTTPS-only cookies and secure headers

## 📈 Performance

- Code splitting by modules
- Lazy loading where appropriate
- Optimized database queries with proper indexing
- Real-time subscriptions with connection pooling

---

Built with ❤️ using React, TypeScript, Tailwind CSS, and Supabase.