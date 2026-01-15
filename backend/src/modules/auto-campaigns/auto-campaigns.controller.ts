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
import { AutoCampaignsService } from './auto-campaigns.service';
import { CreateAutoCampaignDto, UpdateAutoCampaignDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auto-campaigns')
@Controller('auto-campaigns')
export class AutoCampaignsController {
  constructor(private autoCampaignsService: AutoCampaignsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new auto campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid follower range' })
  async create(
    @Body() createAutoCampaignDto: CreateAutoCampaignDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.autoCampaignsService.create(userId, createAutoCampaignDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all auto campaigns with filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'List of auto campaigns' })
  async findAll(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.autoCampaignsService.findAll({
      status,
      userId,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get auto campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign found' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Param('id') id: string) {
    return this.autoCampaignsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update auto campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 403, description: 'You can only update your own campaigns' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiResponse({ status: 400, description: 'Cannot update completed campaign' })
  async update(
    @Param('id') id: string,
    @Body() updateAutoCampaignDto: UpdateAutoCampaignDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.autoCampaignsService.update(id, userId, updateAutoCampaignDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete auto campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 403, description: 'You can only delete your own campaigns' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.autoCampaignsService.delete(id, userId);
  }

  @Get(':id/matches')
  @Public()
  @ApiOperation({ summary: 'Get matched influencers for campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'List of matched influencer cards' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getMatches(@Param('id') id: string) {
    return this.autoCampaignsService.getMatches(id);
  }

  @Post(':id/launch')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Launch auto campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign launched successfully' })
  @ApiResponse({ status: 403, description: 'You can only launch your own campaigns' })
  @ApiResponse({ status: 400, description: 'Can only launch draft campaigns' })
  async launch(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.autoCampaignsService.launchCampaign(id, userId);
  }

  @Post(':id/pause')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Pause auto campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign paused successfully' })
  @ApiResponse({ status: 403, description: 'You can only pause your own campaigns' })
  @ApiResponse({ status: 400, description: 'Invalid campaign status' })
  async pause(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.autoCampaignsService.pauseCampaign(id, userId);
  }

  @Post(':id/resume')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resume auto campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign resumed successfully' })
  @ApiResponse({ status: 403, description: 'You can only resume your own campaigns' })
  @ApiResponse({ status: 400, description: 'Can only resume paused campaigns' })
  async resume(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.autoCampaignsService.resumeCampaign(id, userId);
  }
}
