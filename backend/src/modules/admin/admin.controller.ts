import { Controller, Get, Patch, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @Roles('admin', 'moderator')
  async getAllUsers(
    @Query('role') role?: string,
    @Query('searchQuery') searchQuery?: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    const filters = {
      role,
      searchQuery,
      isDeleted: isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined
    };

    return this.adminService.getAllUsers(filters);
  }

  @Get('campaigns')
  @Roles('admin', 'moderator')
  async getAllCampaigns(
    @Query('status') status?: string,
    @Query('moderationStatus') moderationStatus?: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    const filters = {
      status,
      moderationStatus,
      isDeleted: isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined
    };

    return this.adminService.getAllCampaigns(filters);
  }

  @Get('influencer-cards')
  @Roles('admin', 'moderator')
  async getAllInfluencerCards(
    @Query('moderationStatus') moderationStatus?: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    const filters = {
      moderationStatus,
      isDeleted: isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined
    };

    return this.adminService.getAllInfluencerCards(filters);
  }

  @Get('logs')
  @Roles('admin', 'moderator')
  async getAdminLogs(
    @Query('adminId') adminId?: string,
    @Query('actionType') actionType?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      adminId,
      actionType,
      limit: limit ? parseInt(limit) : undefined
    };

    return this.adminService.getAdminLogs(filters);
  }

  @Patch('users/:id/block')
  @Roles('admin', 'moderator')
  async blockUser(@Param('id') userId: string, @Request() req: any) {
    const adminId = req.user.userId;
    const adminRole = req.user.role || 'user';

    return this.adminService.blockUser(userId, adminId, adminRole);
  }

  @Patch('users/:id/restore')
  @Roles('admin', 'moderator')
  async restoreUser(@Param('id') userId: string, @Request() req: any) {
    const adminId = req.user.userId;
    const adminRole = req.user.role || 'user';

    return this.adminService.restoreUser(userId, adminId, adminRole);
  }

  @Delete('campaigns/:id')
  @Roles('admin', 'moderator')
  async deleteCampaign(@Param('id') campaignId: string, @Request() req: any) {
    const adminId = req.user.userId;
    const adminRole = req.user.role || 'user';

    return this.adminService.deleteCampaign(campaignId, adminId, adminRole);
  }

  @Delete('influencer-cards/:id')
  @Roles('admin', 'moderator')
  async deleteInfluencerCard(@Param('id') cardId: string, @Request() req: any) {
    const adminId = req.user.userId;
    const adminRole = req.user.role || 'user';

    return this.adminService.deleteInfluencerCard(cardId, adminId, adminRole);
  }
}
