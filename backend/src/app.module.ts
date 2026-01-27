import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { InfluencerCardsModule } from './modules/influencer-cards/influencer-cards.module';
import { AdvertiserCardsModule } from './modules/advertiser-cards/advertiser-cards.module';
import { AutoCampaignsModule } from './modules/auto-campaigns/auto-campaigns.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { OffersModule } from './modules/offers/offers.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SupportModule } from './modules/support/support.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { BlacklistModule } from './modules/blacklist/blacklist.module';
import { UserSettingsModule } from './modules/user-settings/user-settings.module';
import { RolesModule } from './modules/roles/roles.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    DatabaseModule,
    AuthModule,
    ProfilesModule,
    InfluencerCardsModule,
    AdvertiserCardsModule,
    AutoCampaignsModule,
    ApplicationsModule,
    OffersModule,
    ReviewsModule,
    PaymentsModule,
    SupportModule,
    FavoritesModule,
    BlacklistModule,
    UserSettingsModule,
    RolesModule,
    ChatModule,
    AdminModule,
    ModerationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
