import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RateLimitService } from './rate-limit.service';
import { CheckRateLimitDto, RecordInteractionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('rate-limit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Post('check')
  @ApiOperation({ summary: 'Check if user is rate limited' })
  async checkRateLimit(
    @CurrentUser('userId') userId: string,
    @Body() dto: CheckRateLimitDto,
  ) {
    const isLimited = await this.rateLimitService.isRateLimited(
      userId,
      dto.targetUserId,
      dto.interactionType,
      dto.cardId
    );
    return { isLimited };
  }

  @Post('record')
  @ApiOperation({ summary: 'Record user interaction' })
  async recordInteraction(
    @CurrentUser('userId') userId: string,
    @Body() dto: RecordInteractionDto,
  ) {
    await this.rateLimitService.recordInteraction(
      userId,
      dto.targetUserId,
      dto.interactionType,
      dto.cardId,
      dto.campaignId
    );
    return { success: true };
  }

  @Get('last-interaction/:targetUserId')
  @ApiOperation({ summary: 'Get last interaction with target user' })
  async getLastInteraction(
    @CurrentUser('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.rateLimitService.getLastInteraction(userId, targetUserId);
  }

  @Get('remaining-time/:targetUserId')
  @ApiOperation({ summary: 'Get remaining time before next interaction' })
  async getRemainingTime(
    @CurrentUser('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const remainingMinutes = await this.rateLimitService.getRemainingTime(userId, targetUserId);
    return { remainingMinutes };
  }

  @Post('can-interact')
  @ApiOperation({ summary: 'Check if user can interact with target' })
  async canInteract(
    @CurrentUser('userId') userId: string,
    @Body() dto: CheckRateLimitDto,
  ) {
    return this.rateLimitService.canInteract(
      userId,
      dto.targetUserId,
      dto.interactionType,
      dto.cardId
    );
  }
}
