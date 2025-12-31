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
import { AdvertiserCardsService } from './advertiser-cards.service';
import { CreateAdvertiserCardDto, UpdateAdvertiserCardDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('advertiser-cards')
@Controller('advertiser-cards')
export class AdvertiserCardsController {
  constructor(private advertiserCardsService: AdvertiserCardsService) {}

  @Post()
  @Roles('advertiser')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new advertiser card' })
  @ApiResponse({ status: 201, description: 'Card created successfully' })
  @ApiResponse({ status: 403, description: 'Only advertisers can create cards' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  async create(
    @Body() createAdvertiserCardDto: CreateAdvertiserCardDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.advertiserCardsService.create(userId, createAdvertiserCardDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all advertiser cards with filters' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'minBudget', required: false, description: 'Minimum budget' })
  @ApiQuery({ name: 'maxBudget', required: false, description: 'Maximum budget' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'List of advertiser cards' })
  async findAll(
    @Query('platform') platform?: string,
    @Query('minBudget', new ParseIntPipe({ optional: true })) minBudget?: number,
    @Query('maxBudget', new ParseIntPipe({ optional: true })) maxBudget?: number,
    @Query('userId') userId?: string,
  ) {
    return this.advertiserCardsService.findAll({
      platform,
      minBudget,
      maxBudget,
      userId,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get advertiser card by ID' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card found' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async findOne(@Param('id') id: string) {
    return this.advertiserCardsService.findOne(id);
  }

  @Patch(':id')
  @Roles('advertiser')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update advertiser card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card updated successfully' })
  @ApiResponse({ status: 403, description: 'You can only update your own cards' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  async update(
    @Param('id') id: string,
    @Body() updateAdvertiserCardDto: UpdateAdvertiserCardDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.advertiserCardsService.update(id, userId, updateAdvertiserCardDto);
  }

  @Delete(':id')
  @Roles('advertiser')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete advertiser card' })
  @ApiParam({ name: 'id', description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card deleted successfully' })
  @ApiResponse({ status: 403, description: 'You can only delete your own cards' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.advertiserCardsService.delete(id, userId);
  }
}
