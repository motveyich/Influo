import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto, UpdateTicketDto, CreateMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('support')
@ApiBearerAuth('JWT-auth')
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  createTicket(@CurrentUser('userId') userId: string, @Body() createDto: CreateTicketDto) {
    return this.supportService.createTicket(userId, createDto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get all support tickets' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  findAllTickets(
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    const isStaff = userRole === 'admin' || userRole === 'moderator';
    return this.supportService.findAllTickets(userId, isStaff, { status, priority });
  }

  @Get('tickets/statistics')
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@CurrentUser('userId') userId: string, @CurrentUser('userType') userRole: string) {
    const isStaff = userRole === 'admin' || userRole === 'moderator';
    return this.supportService.getStatistics(isStaff ? undefined : userId);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOneTicket(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
  ) {
    const isStaff = userRole === 'admin' || userRole === 'moderator';
    return this.supportService.findOneTicket(id, userId, isStaff);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Update ticket' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateTicket(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
    @Body() updateDto: UpdateTicketDto,
  ) {
    const isStaff = userRole === 'admin' || userRole === 'moderator';
    return this.supportService.updateTicket(id, userId, isStaff, updateDto);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to ticket' })
  @ApiResponse({ status: 201, description: 'Message added successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  addMessage(
    @Param('id') ticketId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
    @Body() createDto: CreateMessageDto,
  ) {
    const isStaff = userRole === 'admin' || userRole === 'moderator';
    return this.supportService.addMessage(ticketId, userId, isStaff, createDto);
  }

  @Get('tickets/:id/messages')
  @ApiOperation({ summary: 'Get all messages for ticket' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  getTicketMessages(
    @Param('id') ticketId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('userType') userRole: string,
  ) {
    const isStaff = userRole === 'admin' || userRole === 'moderator';
    return this.supportService.getTicketMessages(ticketId, userId, isStaff);
  }
}
