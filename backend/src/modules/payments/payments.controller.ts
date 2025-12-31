import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentRequestDto, UpdatePaymentRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @Roles('influencer')
  @ApiOperation({ summary: 'Create payment request (influencer only)' })
  @ApiResponse({ status: 201, description: 'Payment request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or business logic error' })
  @ApiResponse({ status: 403, description: 'Forbidden - only influencers can create payment requests' })
  create(@CurrentUser('userId') userId: string, @Body() createDto: CreatePaymentRequestDto) {
    return this.paymentsService.createPaymentRequest(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment requests for current user' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'] })
  @ApiQuery({ name: 'asAdvertiser', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Payment requests retrieved successfully' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('asAdvertiser') asAdvertiser?: string,
  ) {
    return this.paymentsService.findAll(userId, {
      status,
      asAdvertiser: asAdvertiser === 'true',
    });
  }

  @Get('statistics')
  @Roles('influencer')
  @ApiOperation({ summary: 'Get payment statistics for influencer' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@CurrentUser('userId') userId: string) {
    return this.paymentsService.getPaymentStatistics(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment request by ID' })
  @ApiResponse({ status: 200, description: 'Payment request retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.paymentsService.findOne(id, userId);
  }

  @Patch(':id/approve')
  @Roles('advertiser')
  @ApiOperation({ summary: 'Approve payment request (advertiser only)' })
  @ApiResponse({ status: 200, description: 'Payment request approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - only advertisers can approve' })
  approve(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdatePaymentRequestDto,
  ) {
    return this.paymentsService.approve(id, userId, updateDto);
  }

  @Patch(':id/reject')
  @Roles('advertiser')
  @ApiOperation({ summary: 'Reject payment request (advertiser only)' })
  @ApiResponse({ status: 200, description: 'Payment request rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - only advertisers can reject' })
  reject(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdatePaymentRequestDto,
  ) {
    return this.paymentsService.reject(id, userId, updateDto);
  }

  @Patch(':id/mark-paid')
  @Roles('advertiser')
  @ApiOperation({ summary: 'Mark payment request as paid (advertiser only)' })
  @ApiResponse({ status: 200, description: 'Payment request marked as paid successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - only advertisers can mark as paid' })
  markPaid(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdatePaymentRequestDto,
  ) {
    return this.paymentsService.markAsPaid(id, userId, updateDto);
  }

  @Patch(':id/cancel')
  @Roles('influencer')
  @ApiOperation({ summary: 'Cancel payment request (influencer only)' })
  @ApiResponse({ status: 200, description: 'Payment request cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - only influencers can cancel' })
  cancel(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.paymentsService.cancel(id, userId);
  }
}
