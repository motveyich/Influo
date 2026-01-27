import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignMetricsService } from './campaign-metrics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('campaign-metrics')
@ApiBearerAuth('JWT-auth')
@Controller('campaign-metrics')
export class CampaignMetricsController {
  constructor(private campaignMetricsService: CampaignMetricsService) {}

  @Post(':campaignId/views')
  @ApiOperation({ summary: 'Track campaign view' })
  @ApiResponse({ status: 201, description: 'View tracked successfully' })
  trackView(
    @Param('campaignId') campaignId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.campaignMetricsService.trackCampaignView(userId, campaignId);
  }

  @Get(':campaignId')
  @ApiOperation({ summary: 'Get campaign metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  getMetrics(@Param('campaignId') campaignId: string) {
    return this.campaignMetricsService.getCampaignMetrics(campaignId);
  }

  @Post(':campaignId/refresh')
  @ApiOperation({ summary: 'Refresh campaign metrics' })
  @ApiResponse({ status: 200, description: 'Metrics refreshed successfully' })
  refreshMetrics(@Param('campaignId') campaignId: string) {
    return this.campaignMetricsService.refreshCampaignMetrics(campaignId);
  }
}
