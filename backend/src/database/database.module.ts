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
        const dbHost = configService.get('DB_HOST');
        const dbPort = parseInt(configService.get('DB_PORT', '5432'), 10);
        const dbUsername = configService.get('DB_USERNAME');
        const dbPassword = configService.get('DB_PASSWORD');
        const dbDatabase = configService.get('DB_DATABASE', 'postgres');
        const sslEnabled = configService.get('DB_SSL') === 'true' || configService.get('DB_SSL') === true;

        console.log('🔧 Database Configuration:', {
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          database: dbDatabase,
          ssl: sslEnabled,
          hasPassword: !!dbPassword,
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
          console.error('❌ Missing required database configuration:');
          console.error('DB_HOST:', dbHost ? 'SET' : 'MISSING');
          console.error('DB_USERNAME:', dbUsername ? 'SET' : 'MISSING');
          console.error('DB_PASSWORD:', dbPassword ? 'SET' : 'MISSING');
          throw new Error('Missing required database environment variables. Please check DB_HOST, DB_USERNAME, and DB_PASSWORD.');
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
            // Optimized for serverless (Vercel)
            max: 3, // Maximum number of connections
            connectionTimeoutMillis: 10000, // 10 seconds
            idleTimeoutMillis: 30000, // 30 seconds
            statement_timeout: 30000, // 30 seconds query timeout
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
