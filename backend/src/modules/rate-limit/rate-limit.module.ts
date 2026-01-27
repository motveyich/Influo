import { Module } from '@nestjs/common';
import { RateLimitController } from './rate-limit.controller';
import { RateLimitService } from './rate-limit.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [RateLimitController],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
