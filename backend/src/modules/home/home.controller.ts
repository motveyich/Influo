import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HomeService, UserStats, PlatformUpdate, PlatformEvent } from './home.service';

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('stats')
  async getUserStats(@CurrentUser() user: any): Promise<UserStats> {
    return this.homeService.getUserStats(user.id);
  }

  @Get('updates')
  async getPlatformUpdates(): Promise<PlatformUpdate[]> {
    return this.homeService.getPlatformUpdates();
  }

  @Get('events')
  async getPlatformEvents(): Promise<PlatformEvent[]> {
    return this.homeService.getPlatformEvents();
  }
}
