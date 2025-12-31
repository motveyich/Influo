import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('favorites')
@ApiBearerAuth('JWT-auth')
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Add card to favorites' })
  @ApiResponse({ status: 201, description: 'Card added to favorites successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  @ApiResponse({ status: 409, description: 'Card already in favorites' })
  addFavorite(@CurrentUser('userId') userId: string, @Body() createDto: CreateFavoriteDto) {
    return this.favoritesService.addFavorite(userId, createDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove card from favorites' })
  @ApiResponse({ status: 200, description: 'Card removed from favorites successfully' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  removeFavorite(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.favoritesService.removeFavorite(userId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all favorites for current user' })
  @ApiQuery({ name: 'cardType', required: false, enum: ['influencer', 'advertiser'] })
  @ApiResponse({ status: 200, description: 'Favorites retrieved successfully' })
  findAll(@CurrentUser('userId') userId: string, @Query('cardType') cardType?: string) {
    return this.favoritesService.findAll(userId, { cardType });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get favorites statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@CurrentUser('userId') userId: string) {
    return this.favoritesService.getStatistics(userId);
  }

  @Get('check/:cardId/:cardType')
  @ApiOperation({ summary: 'Check if card is in favorites' })
  @ApiResponse({ status: 200, description: 'Check completed successfully' })
  async isFavorite(
    @CurrentUser('userId') userId: string,
    @Param('cardId') cardId: string,
    @Param('cardType') cardType: string,
  ) {
    const isFavorite = await this.favoritesService.isFavorite(userId, cardId, cardType);
    return { isFavorite };
  }
}
