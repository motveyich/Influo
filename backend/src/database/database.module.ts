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
        const dbPort = configService.get('DB_PORT', 5432);
        const dbUsername = configService.get('DB_USERNAME');
        const dbDatabase = configService.get('DB_DATABASE', 'postgres');
        const sslEnabled = configService.get('DB_SSL') === 'true';

        console.log('🔧 Database Configuration:', {
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          database: dbDatabase,
          ssl: sslEnabled,
        });

        return {
          type: 'postgres',
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: configService.get('DB_PASSWORD'),
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
