import {
  Controller,
  Get,
  Post,
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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('applications')
@Controller('applications')
@ApiBearerAuth('JWT-auth')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application' })
  @ApiResponse({ status: 201, description: 'Application created successfully' })
  @ApiResponse({ status: 409, description: 'Already applied or cannot apply to own card' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async create(
    @Body() createApplicationDto: CreateApplicationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.create(userId, createApplicationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all applications' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'asOwner', required: false, description: 'Get applications for your cards', type: Boolean })
  @ApiResponse({ status: 200, description: 'List of applications' })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('asOwner', new ParseBoolPipe({ optional: true })) asOwner?: boolean,
  ) {
    return this.applicationsService.findAll(userId, { status, asOwner });
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application accepted' })
  @ApiResponse({ status: 403, description: 'Only card owner can accept' })
  @ApiResponse({ status: 409, description: 'Application already processed' })
  async accept(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.accept(id, userId);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application declined' })
  @ApiResponse({ status: 403, description: 'Only card owner can decline' })
  @ApiResponse({ status: 409, description: 'Application already processed' })
  async decline(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.decline(id, userId);
  }

  @Post(':id/in-progress')
  @ApiOperation({ summary: 'Mark application as in progress' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application marked as in progress' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this application' })
  async markInProgress(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.markInProgress(id, userId);
  }

  @Post(':id/completion-screenshot')
  @ApiOperation({ summary: 'Upload completion screenshot for application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
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
  @ApiResponse({ status: 403, description: 'Not authorized to upload screenshot for this application' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompletionScreenshot(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|jpg|jpe|jfif|png|webp)$/,
            skipMagicNumbersValidation: true
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.applicationsService.uploadCompletionScreenshot(id, userId, file);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Request completion of application (requires confirmation from partner)' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Completion request sent, awaiting partner confirmation' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this application' })
  @ApiResponse({ status: 409, description: 'Can only complete applications that are in progress' })
  async complete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.complete(id, userId);
  }

  @Post(':id/confirm-completion')
  @ApiOperation({ summary: 'Confirm completion of application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application marked as completed' })
  @ApiResponse({ status: 403, description: 'Cannot confirm your own completion request' })
  @ApiResponse({ status: 409, description: 'Application is not pending completion' })
  async confirmCompletion(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.confirmCompletion(id, userId);
  }

  @Post(':id/reject-completion')
  @ApiOperation({ summary: 'Reject completion request and return to in-progress' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Completion request rejected, application back to in-progress' })
  @ApiResponse({ status: 403, description: 'Cannot reject your own completion request' })
  @ApiResponse({ status: 409, description: 'Application is not pending completion' })
  async rejectCompletion(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.rejectCompletion(id, userId);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application terminated' })
  @ApiResponse({ status: 403, description: 'Not authorized to terminate this application' })
  async terminate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.terminate(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application cancelled' })
  @ApiResponse({ status: 403, description: 'Only applicant can cancel' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.cancel(id, userId);
  }
}
