import { Module } from '@nestjs/common';
import { CampaignMetricsController } from './campaign-metrics.controller';
import { CampaignMetricsService } from './campaign-metrics.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CampaignMetricsController],
  providers: [CampaignMetricsService],
  exports: [CampaignMetricsService],
})
export class CampaignMetricsModule {}
