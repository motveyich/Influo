import { Module } from '@nestjs/common';
import { CardAnalyticsController } from './card-analytics.controller';
import { CardAnalyticsService } from './card-analytics.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CardAnalyticsController],
  providers: [CardAnalyticsService],
  exports: [CardAnalyticsService],
})
export class CardAnalyticsModule {}
