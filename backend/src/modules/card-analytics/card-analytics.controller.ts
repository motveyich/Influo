import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CardAnalyticsService } from './card-analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TrackViewDto } from './dto';

@ApiTags('card-analytics')
@ApiBearerAuth('JWT-auth')
@Controller('card-analytics')
export class CardAnalyticsController {
  constructor(private cardAnalyticsService: CardAnalyticsService) {}

  @Post('track-view')
  @ApiOperation({ summary: 'Track card view' })
  @ApiResponse({ status: 201, description: 'View tracked successfully' })
  trackView(@Body() dto: TrackViewDto, @CurrentUser('userId') viewerId?: string) {
    return this.cardAnalyticsService.trackCardView(dto.cardId, dto.cardType, viewerId || dto.viewerId);
  }

  @Get('card/:cardId')
  @ApiOperation({ summary: 'Get card analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  getCardAnalytics(
    @Param('cardId') cardId: string,
    @Query('cardType') cardType: string,
  ) {
    return this.cardAnalyticsService.getCardAnalytics(cardId, cardType);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user card analytics' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved successfully' })
  getUserAnalytics(@CurrentUser('userId') userId: string) {
    return this.cardAnalyticsService.getUserCardAnalytics(userId);
  }
}
