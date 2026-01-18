import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSettingsService } from './user-settings.service';
import { UpdateSettingsDto, ChangePasswordDto } from './dto';

@ApiTags('user-settings')
@Controller('user-settings')
@ApiBearerAuth('JWT-auth')
export class UserSettingsController {
  private readonly logger = new Logger(UserSettingsController.name);

  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get user settings' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User settings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async getUserSettings(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('userType') userType?: string
  ) {
    this.logger.log(`Getting settings for user: ${userId} (requested by: ${currentUserId})`);

    // Users can only access their own settings unless they're admin
    if (currentUserId !== userId && userType !== 'admin') {
      this.logger.warn(`Unauthorized access attempt to settings by user: ${currentUserId}`);
      throw new UnauthorizedException('You can only access your own settings');
    }

    return this.userSettingsService.getUserSettings(userId);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid settings data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSettings(
    @Param('userId') userId: string,
    @Body() updates: UpdateSettingsDto,
    @CurrentUser('userId') currentUserId: string
  ) {
    this.logger.log(`Updating settings for user: ${userId} (requested by: ${currentUserId})`);

    // Users can only update their own settings
    if (currentUserId !== userId) {
      this.logger.warn(`Unauthorized update attempt by user: ${currentUserId}`);
      throw new UnauthorizedException('You can only update your own settings');
    }

    return this.userSettingsService.updateSettings(userId, updates);
  }

  @Post(':userId/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Param('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser('userId') currentUserId: string
  ) {
    this.logger.log(`Changing password for user: ${userId} (requested by: ${currentUserId})`);

    // Users can only change their own password
    if (currentUserId !== userId) {
      this.logger.warn(`Unauthorized password change attempt by user: ${currentUserId}`);
      throw new UnauthorizedException('You can only change your own password');
    }

    await this.userSettingsService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );

    return { message: 'Password changed successfully' };
  }

  @Post(':userId/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivateAccount(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @CurrentUser('userId') currentUserId: string
  ) {
    this.logger.log(`Deactivating account for user: ${userId} (requested by: ${currentUserId})`);

    // Users can only deactivate their own account
    if (currentUserId !== userId) {
      this.logger.warn(`Unauthorized deactivation attempt by user: ${currentUserId}`);
      throw new UnauthorizedException('You can only deactivate your own account');
    }

    await this.userSettingsService.deactivateAccount(userId, reason);

    return { message: 'Account deactivated successfully' };
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string
  ) {
    this.logger.log(`Deleting account for user: ${userId} (requested by: ${currentUserId})`);

    // Users can only delete their own account
    if (currentUserId !== userId) {
      this.logger.warn(`Unauthorized deletion attempt by user: ${currentUserId}`);
      throw new UnauthorizedException('You can only delete your own account');
    }

    await this.userSettingsService.deleteAccount(userId);

    return { message: 'Account deleted successfully' };
  }
}
