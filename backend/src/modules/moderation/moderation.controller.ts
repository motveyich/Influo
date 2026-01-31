import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModerationService } from './moderation.service';

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('reports')
  @Roles('admin', 'moderator')
  async getReports(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      status,
      type,
      limit: limit ? parseInt(limit) : undefined
    };

    return this.moderationService.getReports(filters);
  }

  @Get('queue')
  @Roles('admin', 'moderator')
  async getModerationQueue(
    @Query('status') status?: string,
    @Query('contentType') contentType?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      status,
      contentType,
      limit: limit ? parseInt(limit) : undefined
    };

    return this.moderationService.getModerationQueue(filters);
  }

  @Patch('reports/:id')
  @Roles('admin', 'moderator')
  async updateReportStatus(
    @Param('id') reportId: string,
    @Body('status') status: string,
    @Body('resolution') resolution: string,
    @Request() req: any
  ) {
    const moderatorId = req.user.userId;
    const moderatorRole = req.user.userType || 'user';

    return this.moderationService.updateReportStatus(reportId, status, moderatorId, moderatorRole, resolution);
  }

  @Patch('queue/:id')
  @Roles('admin', 'moderator')
  async updateModerationQueueItem(
    @Param('id') itemId: string,
    @Body('status') status: string,
    @Body('moderationNotes') moderationNotes: string,
    @Request() req: any
  ) {
    const moderatorId = req.user.userId;
    const moderatorRole = req.user.userType || 'user';

    return this.moderationService.updateModerationQueueItem(itemId, status, moderatorId, moderatorRole, moderationNotes);
  }

  @Patch('queue/:id/approve')
  @Roles('admin', 'moderator')
  async approveContent(@Param('id') itemId: string, @Request() req: any) {
    const moderatorId = req.user.userId;
    const moderatorRole = req.user.userType || 'user';

    return this.moderationService.approveContent(itemId, moderatorId, moderatorRole);
  }

  @Patch('queue/:id/reject')
  @Roles('admin', 'moderator')
  async rejectContent(
    @Param('id') itemId: string,
    @Body('reason') reason: string,
    @Request() req: any
  ) {
    const moderatorId = req.user.userId;
    const moderatorRole = req.user.userType || 'user';

    return this.moderationService.rejectContent(itemId, moderatorId, moderatorRole, reason);
  }
}
