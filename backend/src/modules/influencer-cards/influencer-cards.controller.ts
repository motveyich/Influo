import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InfluencerCardsService } from './influencer-cards.service';
import { CreateInfluencerCardDto, UpdateInfluencerCardDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, Public } from '../../common/decorators';

@ApiTags('influencer-cards')
@Controller('influencer-cards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InfluencerCardsController {
  constructor(private influencerCardsService: InfluencerCardsService) {}

  @Post()
  @Roles('influencer')
  @ApiOperation({ summary: 'Create a new influencer card' })
  @ApiResponse({ status: 201, description: 'Card created successfully' })
  @ApiResponse({ status: 403, description: 'Only influencers can create cards' })
  async create(
    @Body() createInfluencerCardDto: CreateInfluencerCardDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.influencerCardsService.create(userId, createInfluencerCardDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all influencer cards with filters' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'minFollowers', required: false, description: 'Minimum followers' })
  @ApiQuery({ name: 'maxFollowers', required: false, description: 'Maximum followers' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'countries', required: false, description: 'Filter by countries' })
  @ApiQuery({ name: 'searchQuery', required: false, description: 'Search in description and interests' })
  @ApiResponse({ status: 200, description: 'List of influencer cards' })
  async findAll(
    @Query('platform') platform?: string,
    @Query('minFollowers') minFollowers?: string,
    @Query('maxFollowers') maxFollowers?: string,
    @Query('userId') userId?: string,
    @Query('countries') countries?: string | string[],
    @Query('searchQuery') searchQuery?: string,
  ) {
    const parsedMinFollowers = minFollowers ? parseInt(minFollowers, 10) : undefined;
    const parsedMaxFollowers = maxFollowers ? parseInt(maxFollowers, 10) : undefined;
    const countriesArray = countries
      ? (Array.isArray(countries) ? countries : [countries])
      : undefined;

    return this.influencerCardsService.findAll({
      platform,
      minFollowers: parsedMinFollowers !== undefined && !isNaN(parsedMinFollowers) ? parsedMinFollowers : undefined,
      maxFollowers: parsedMaxFollowers !== undefined && !isNaN(parsedMaxFollowers) ? parsedMaxFollowers : undefined,
      userId,
      countries: countriesArray,
      searchQuery,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get influencer card by ID' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card found' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async findOne(@Param('id') id: string) {
    return this.influencerCardsService.findOne(id);
  }

  @Patch(':id')
  @Roles('influencer')
  @ApiOperation({ summary: 'Update influencer card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card updated successfully' })
  @ApiResponse({ status: 403, description: 'You can only update your own cards' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async update(
    @Param('id') id: string,
    @Body() updateInfluencerCardDto: UpdateInfluencerCardDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.influencerCardsService.update(id, userId, updateInfluencerCardDto);
  }

  @Delete(':id')
  @Roles('influencer')
  @ApiOperation({ summary: 'Delete influencer card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card deleted successfully' })
  @ApiResponse({ status: 403, description: 'You can only delete your own cards' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.influencerCardsService.delete(id, userId);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get card analytics' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card analytics' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getAnalytics(@Param('id') id: string) {
    return this.influencerCardsService.getCardAnalytics(id);
  }
}
