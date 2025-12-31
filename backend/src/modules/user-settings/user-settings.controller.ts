import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSettingsService } from './user-settings.service';
import { UpdateSettingsDto, ChangePasswordDto } from './dto';

@Controller('user-settings')
@ApiBearerAuth('JWT-auth')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get(':userId')
  async getUserSettings(
    @Param('userId') userId: string,
    @CurrentUser() user: any
  ) {
    // Users can only access their own settings unless they're admin
    if (user.id !== userId && user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    return this.userSettingsService.getUserSettings(userId);
  }

  @Put(':userId')
  async updateSettings(
    @Param('userId') userId: string,
    @Body() updates: UpdateSettingsDto,
    @CurrentUser() user: any
  ) {
    // Users can only update their own settings
    if (user.id !== userId) {
      throw new Error('Unauthorized');
    }

    return this.userSettingsService.updateSettings(userId, updates);
  }

  @Post(':userId/change-password')
  async changePassword(
    @Param('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: any
  ) {
    // Users can only change their own password
    if (user.id !== userId) {
      throw new Error('Unauthorized');
    }

    await this.userSettingsService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );

    return { message: 'Password changed successfully' };
  }

  @Post(':userId/deactivate')
  async deactivateAccount(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any
  ) {
    // Users can only deactivate their own account
    if (user.id !== userId) {
      throw new Error('Unauthorized');
    }

    await this.userSettingsService.deactivateAccount(userId, reason);

    return { message: 'Account deactivated successfully' };
  }

  @Delete(':userId')
  async deleteAccount(
    @Param('userId') userId: string,
    @CurrentUser() user: any
  ) {
    // Users can only delete their own account
    if (user.id !== userId) {
      throw new Error('Unauthorized');
    }

    await this.userSettingsService.deleteAccount(userId);

    return { message: 'Account deleted successfully' };
  }
}
