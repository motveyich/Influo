import {
  Controller,
  Get,
  Post,
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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
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
}
