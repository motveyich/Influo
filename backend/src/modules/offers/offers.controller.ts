import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators';

@ApiTags('offers')
@Controller('offers')
@ApiBearerAuth('JWT-auth')
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Post()
  @Roles('advertiser')
  @ApiOperation({ summary: 'Create a new offer' })
  @ApiResponse({ status: 201, description: 'Offer created successfully' })
  @ApiResponse({ status: 403, description: 'Only advertisers can create offers' })
  @ApiResponse({ status: 404, description: 'Influencer not found' })
  async create(
    @Body() createOfferDto: CreateOfferDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.create(userId, createOfferDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all offers' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'asInfluencer', required: false, description: 'Get offers as influencer', type: Boolean })
  @ApiResponse({ status: 200, description: 'List of offers' })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('asInfluencer', new ParseBoolPipe({ optional: true })) asInfluencer?: boolean,
  ) {
    return this.offersService.findAll(userId, { status, asInfluencer });
  }

  @Get('participant/:userId')
  @ApiOperation({ summary: 'Get all offers where user is a participant' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of offers where user is participant' })
  @ApiResponse({ status: 403, description: 'You can only view your own offers' })
  async findByParticipant(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    if (userId !== currentUserId) {
      throw new Error('You can only view your own offers');
    }
    return this.offersService.findByParticipant(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer by ID' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer found' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  @ApiResponse({ status: 403, description: 'You can only view your own offers' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles('advertiser')
  @ApiOperation({ summary: 'Update offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer updated successfully' })
  @ApiResponse({ status: 403, description: 'Only offer creator can update' })
  @ApiResponse({ status: 400, description: 'Can only update pending offers' })
  async update(
    @Param('id') id: string,
    @Body() updateOfferDto: UpdateOfferDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.update(id, userId, updateOfferDto);
  }

  @Post(':id/accept')
  @Roles('influencer')
  @ApiOperation({ summary: 'Accept an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer accepted' })
  @ApiResponse({ status: 403, description: 'Only influencer can accept' })
  async accept(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.accept(id, userId);
  }

  @Post(':id/decline')
  @Roles('influencer')
  @ApiOperation({ summary: 'Decline an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer declined' })
  @ApiResponse({ status: 403, description: 'Only influencer can decline' })
  async decline(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.decline(id, userId);
  }

  @Post(':id/in-progress')
  @Roles('influencer')
  @ApiOperation({ summary: 'Mark offer as in progress' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer marked as in progress' })
  async markInProgress(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.markInProgress(id, userId);
  }

  @Post(':id/complete')
  @Roles('influencer')
  @ApiOperation({ summary: 'Mark offer as completed' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer marked as completed' })
  async markCompleted(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.markCompleted(id, userId);
  }

  @Post(':id/cancel')
  @Roles('advertiser')
  @ApiOperation({ summary: 'Cancel an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer cancelled' })
  @ApiResponse({ status: 403, description: 'Only advertiser can cancel' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.cancel(id, userId);
  }
}
