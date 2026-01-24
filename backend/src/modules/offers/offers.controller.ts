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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @ApiOperation({ summary: 'Create a new offer' })
  @ApiResponse({ status: 201, description: 'Offer created successfully' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
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

  @Get('auto-campaign/:campaignId')
  @ApiOperation({ summary: 'Get all offers for an auto-campaign' })
  @ApiParam({ name: 'campaignId', description: 'Auto Campaign ID' })
  @ApiResponse({ status: 200, description: 'List of offers for the campaign' })
  @ApiResponse({ status: 403, description: 'You can only view offers for your own campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findByAutoCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.findByAutoCampaign(campaignId, userId);
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
  @ApiOperation({ summary: 'Accept an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer accepted' })
  @ApiResponse({ status: 403, description: 'Only recipient can accept' })
  async accept(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.accept(id, userId);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer declined' })
  @ApiResponse({ status: 403, description: 'Only recipient can decline' })
  async decline(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.decline(id, userId);
  }

  @Post(':id/in-progress')
  @ApiOperation({ summary: 'Mark offer as in progress' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer marked as in progress' })
  async markInProgress(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.markInProgress(id, userId);
  }

  @Post(':id/completion-screenshot')
  @ApiOperation({ summary: 'Upload completion screenshot' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Screenshot uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 403, description: 'Not authorized to upload screenshot for this offer' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompletionScreenshot(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|jpe|jfif|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.offersService.uploadCompletionScreenshot(id, userId, file);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark offer as completed with screenshot proof' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer marked as completed' })
  @ApiResponse({ status: 400, description: 'Screenshot URL is required' })
  async markCompleted(
    @Param('id') id: string,
    @Body() markCompletedDto: { screenshotUrl: string },
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.markCompleted(id, userId, markCompletedDto.screenshotUrl);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer terminated' })
  @ApiResponse({ status: 403, description: 'Not authorized to terminate this offer' })
  async terminate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.terminate(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer cancelled' })
  @ApiResponse({ status: 403, description: 'Only sender can cancel' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.cancel(id, userId);
  }

  @Post(':id/confirm-completion')
  @ApiOperation({ summary: 'Confirm offer completion' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer completion confirmed' })
  @ApiResponse({ status: 403, description: 'Cannot confirm own completion request' })
  @ApiResponse({ status: 409, description: 'Offer is not pending completion' })
  async confirmCompletion(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.confirmCompletion(id, userId);
  }

  @Post(':id/reject-completion')
  @ApiOperation({ summary: 'Reject offer completion' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer completion rejected' })
  @ApiResponse({ status: 403, description: 'Cannot reject own completion request' })
  @ApiResponse({ status: 409, description: 'Offer is not pending completion' })
  async rejectCompletion(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.rejectCompletion(id, userId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get offer status history' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer history retrieved' })
  @ApiResponse({ status: 403, description: 'You can only view history of your own offers' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async getHistory(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.offersService.getOfferHistory(id, userId);
  }
}
