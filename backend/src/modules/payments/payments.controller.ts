import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentRequestDto, UpdatePaymentRequestDto, UpdatePaymentStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create payment request' })
  @ApiResponse({ status: 201, description: 'Payment request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or business logic error' })
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
  @ApiOperation({ summary: 'Get payment statistics' })
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
  @ApiOperation({ summary: 'Approve payment request' })
  @ApiResponse({ status: 200, description: 'Payment request approved successfully' })
  approve(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdatePaymentRequestDto,
  ) {
    return this.paymentsService.approve(id, userId, updateDto);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject payment request' })
  @ApiResponse({ status: 200, description: 'Payment request rejected successfully' })
  reject(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdatePaymentRequestDto,
  ) {
    return this.paymentsService.reject(id, userId, updateDto);
  }

  @Patch(':id/mark-paid')
  @ApiOperation({ summary: 'Mark payment request as paid' })
  @ApiResponse({ status: 200, description: 'Payment request marked as paid successfully' })
  markPaid(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdatePaymentRequestDto,
  ) {
    return this.paymentsService.markAsPaid(id, userId, updateDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel payment request' })
  @ApiResponse({ status: 200, description: 'Payment request cancelled successfully' })
  cancel(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.paymentsService.cancel(id, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update payment request status' })
  @ApiResponse({ status: 200, description: 'Payment request status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updatePaymentStatus(id, userId, updateStatusDto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment request' })
  @ApiResponse({ status: 200, description: 'Payment request deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete payment request in current status' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.paymentsService.deletePaymentRequest(id, userId);
  }
}
