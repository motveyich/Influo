import { Controller, Get, Put, Post, Body, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService, UserSettings } from './settings.service';
import { UpdateSettingsDto, ChangePasswordDto, TwoFactorDto, DeactivateAccountDto, DeleteAccountDto } from './dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getUserSettings(@CurrentUser() user: any): Promise<UserSettings> {
    return this.settingsService.getUserSettings(user.id);
  }

  @Put()
  async updateSettings(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateSettingsDto
  ): Promise<UserSettings> {
    return this.settingsService.updateSettings(user.id, updateDto);
  }

  @Post('password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    await this.settingsService.changePassword(
      user.id,
      user.email,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
    return { success: true, message: 'Password changed successfully' };
  }

  @Post('two-factor/enable')
  async enableTwoFactor(@CurrentUser() user: any) {
    return this.settingsService.enableTwoFactor(user.id);
  }

  @Post('two-factor/disable')
  async disableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: TwoFactorDto
  ) {
    await this.settingsService.disableTwoFactor(user.id, dto.verificationCode);
    return { success: true, message: '2FA disabled successfully' };
  }

  @Post('sessions/signout-all')
  async signOutAllDevices(@CurrentUser() user: any) {
    await this.settingsService.signOutAllDevices(user.id);
    return { success: true, message: 'Signed out from all devices' };
  }

  @Post('account/deactivate')
  async deactivateAccount(
    @CurrentUser() user: any,
    @Body() dto: DeactivateAccountDto
  ) {
    await this.settingsService.deactivateAccount(user.id, dto.reason);
    return { success: true, message: 'Account deactivated' };
  }

  @Delete('account')
  async deleteAccount(
    @CurrentUser() user: any,
    @Body() dto: DeleteAccountDto
  ) {
    await this.settingsService.deleteAccount(user.id, dto.confirmationText);
    return { success: true, message: 'Account deleted' };
  }
}
