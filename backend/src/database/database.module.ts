import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  UserProfile,
  AdvertiserCard,
  InfluencerCard,
  AutoCampaign,
  Offer,
  Application,
  Review,
  PaymentRequest,
  Blacklist,
  Favorite,
  Conversation,
  Message,
  UserSettings,
  RateLimitInteraction,
  UserRoleAssignment,
  ContentReport,
  ModerationQueue,
  AdminLog,
  ContentFilter,
  SupportTicket,
  SupportMessage,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        let dbHost: string;
        let dbPort: number;
        let dbUsername: string;
        let dbPassword: string;
        let dbDatabase: string;
        let sslEnabled: boolean;

        if (databaseUrl) {
          try {
            const url = new URL(databaseUrl);
            dbHost = url.hostname;
            dbPort = parseInt(url.port) || 5432;
            dbUsername = decodeURIComponent(url.username);
            dbPassword = decodeURIComponent(url.password);
            dbDatabase = url.pathname.slice(1) || 'postgres';
            sslEnabled = url.searchParams.get('sslmode') !== 'disable';

            console.log('✅ Using DATABASE_URL for connection');
            console.log('🔧 Parsed Database Configuration:', {
              host: dbHost,
              port: dbPort,
              username: dbUsername.substring(0, 10) + '***',
              database: dbDatabase,
              ssl: sslEnabled,
            });
          } catch (error: any) {
            console.error('❌ Failed to parse DATABASE_URL:', error.message);
            throw new Error('Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database');
          }
        } else {
          dbHost = configService.get<string>('DB_HOST') || '';
          dbPort = parseInt(configService.get<string>('DB_PORT', '5432'), 10);
          dbUsername = configService.get<string>('DB_USERNAME') || '';
          dbPassword = configService.get<string>('DB_PASSWORD') || '';
          dbDatabase = configService.get<string>('DB_DATABASE', 'postgres');
          sslEnabled = configService.get<string>('DB_SSL') === 'true' || configService.get<boolean>('DB_SSL') === true;

          console.log('🔧 Using individual DB_* environment variables');
          console.log('🔧 Database Configuration:', {
            host: dbHost,
            port: dbPort,
            username: dbUsername ? dbUsername.substring(0, 10) + '***' : 'MISSING',
            database: dbDatabase,
            ssl: sslEnabled,
            envVars: {
              DB_HOST: !!process.env.DB_HOST,
              DB_PORT: !!process.env.DB_PORT,
              DB_USERNAME: !!process.env.DB_USERNAME,
              DB_PASSWORD: !!process.env.DB_PASSWORD,
              DB_DATABASE: !!process.env.DB_DATABASE,
              DB_SSL: !!process.env.DB_SSL,
            }
          });

          if (!dbHost || !dbUsername || !dbPassword) {
            console.error('❌ Missing required database configuration.');
            console.error('Please set either:');
            console.error('  1. DATABASE_URL (recommended for Vercel)');
            console.error('     Example: postgresql://user:password@host:port/database');
            console.error('  OR');
            console.error('  2. Individual variables: DB_HOST, DB_USERNAME, DB_PASSWORD');
            throw new Error('Missing database configuration. Set DATABASE_URL or DB_* variables.');
          }
        }

        return {
          type: 'postgres',
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
          entities: [
            UserProfile,
            AdvertiserCard,
            InfluencerCard,
            AutoCampaign,
            Offer,
            Application,
            Review,
            PaymentRequest,
            Blacklist,
            Favorite,
            Conversation,
            Message,
            UserSettings,
            RateLimitInteraction,
            UserRoleAssignment,
            ContentReport,
            ModerationQueue,
            AdminLog,
            ContentFilter,
            SupportTicket,
            SupportMessage,
          ],
          synchronize: false,
          logging: configService.get('NODE_ENV') === 'development',
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          extra: {
            max: 3,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            statement_timeout: 30000,
            query_timeout: 30000,
          },
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
