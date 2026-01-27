import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContentManagementService } from './content-management.service';
import { CreatePlatformUpdateDto, UpdatePlatformUpdateDto, CreatePlatformEventDto, UpdatePlatformEventDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('content-management')
@ApiBearerAuth('JWT-auth')
@Controller('content-management')
export class ContentManagementController {
  constructor(private contentManagementService: ContentManagementService) {}

  @Post('updates')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Create platform update' })
  @ApiResponse({ status: 201, description: 'Update created successfully' })
  createUpdate(@CurrentUser('userId') userId: string, @Body() dto: CreatePlatformUpdateDto) {
    return this.contentManagementService.createPlatformUpdate(userId, dto);
  }

  @Patch('updates/:id')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Update platform update' })
  @ApiResponse({ status: 200, description: 'Update updated successfully' })
  updateUpdate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
    @Body() dto: UpdatePlatformUpdateDto,
  ) {
    const isAdmin = userRole === 'admin';
    return this.contentManagementService.updatePlatformUpdate(id, userId, isAdmin, dto);
  }

  @Delete('updates/:id')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Delete platform update' })
  @ApiResponse({ status: 200, description: 'Update deleted successfully' })
  deleteUpdate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
  ) {
    const isAdmin = userRole === 'admin';
    return this.contentManagementService.deletePlatformUpdate(id, userId, isAdmin);
  }

  @Get('updates')
  @ApiOperation({ summary: 'Get platform updates' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'is_published', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Updates retrieved successfully' })
  getUpdates(
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('is_published') is_published?: string,
  ) {
    const filters: any = {};
    if (type) filters.type = type;
    if (priority) filters.priority = priority;
    if (is_published !== undefined) filters.is_published = is_published === 'true';
    return this.contentManagementService.getPlatformUpdates(filters);
  }

  @Get('updates/published')
  @ApiOperation({ summary: 'Get published platform updates' })
  @ApiResponse({ status: 200, description: 'Published updates retrieved successfully' })
  getPublishedUpdates() {
    return this.contentManagementService.getPublishedUpdates();
  }

  @Post('events')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Create platform event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  createEvent(@CurrentUser('userId') userId: string, @Body() dto: CreatePlatformEventDto) {
    return this.contentManagementService.createPlatformEvent(userId, dto);
  }

  @Patch('events/:id')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Update platform event' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  updateEvent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
    @Body() dto: UpdatePlatformEventDto,
  ) {
    const isAdmin = userRole === 'admin';
    return this.contentManagementService.updatePlatformEvent(id, userId, isAdmin, dto);
  }

  @Delete('events/:id')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Delete platform event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  deleteEvent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
  ) {
    const isAdmin = userRole === 'admin';
    return this.contentManagementService.deletePlatformEvent(id, userId, isAdmin);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get platform events' })
  @ApiQuery({ name: 'event_type', required: false })
  @ApiQuery({ name: 'is_published', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  getEvents(
    @Query('event_type') event_type?: string,
    @Query('is_published') is_published?: string,
  ) {
    const filters: any = {};
    if (event_type) filters.event_type = event_type;
    if (is_published !== undefined) filters.is_published = is_published === 'true';
    return this.contentManagementService.getPlatformEvents(filters);
  }

  @Get('events/published')
  @ApiOperation({ summary: 'Get published platform events' })
  @ApiResponse({ status: 200, description: 'Published events retrieved successfully' })
  getPublishedEvents() {
    return this.contentManagementService.getPublishedEvents();
  }
}
