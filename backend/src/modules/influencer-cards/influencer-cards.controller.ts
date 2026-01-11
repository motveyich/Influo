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
  ParseIntPipe,
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
import { CurrentUser } from '../../common/decorators';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('influencer-cards')
@Controller('influencer-cards')
export class InfluencerCardsController {
  constructor(private influencerCardsService: InfluencerCardsService) {}

  @Post()
  @Roles('influencer')
  @ApiBearerAuth('JWT-auth')
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
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'List of influencer cards' })
  async findAll(
    @Query('platform') platform?: string,
    @Query('minFollowers', new ParseIntPipe({ optional: true })) minFollowers?: number,
    @Query('maxFollowers', new ParseIntPipe({ optional: true })) maxFollowers?: number,
    @Query('userId') userId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.influencerCardsService.findAll({
      platform,
      minFollowers,
      maxFollowers,
      userId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
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
  @ApiBearerAuth('JWT-auth')
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
  @ApiBearerAuth('JWT-auth')
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
  @Public()
  @ApiOperation({ summary: 'Get card analytics' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card analytics' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getAnalytics(@Param('id') id: string) {
    return this.influencerCardsService.getCardAnalytics(id);
  }
}
