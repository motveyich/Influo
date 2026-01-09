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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { ProfilesService } from './profiles.service';
import { CreateProfileDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update user profile' })
  @ApiResponse({ status: 201, description: 'Profile created/updated successfully' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createProfileDto: CreateProfileDto,
    @CurrentUser('userId') currentUserId: string,
  ) {
    if (createProfileDto.userId && createProfileDto.userId !== currentUserId) {
      return { message: 'You can only create your own profile' };
    }
    createProfileDto.userId = currentUserId;
    return this.profilesService.create(createProfileDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  async update(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser('userId') currentUserId: string,
  ) {
    if (id !== currentUserId) {
      return { message: 'You can only update your own profile' };
    }
    return this.profilesService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile deleted successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    if (id !== currentUserId) {
      return { message: 'You can only delete your own profile' };
    }
    return this.profilesService.delete(id);
  }

  @Get(':id/completion')
  @Public()
  @ApiOperation({ summary: 'Get profile completion percentage' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile completion data' })
  async getCompletion(@Param('id') id: string) {
    return this.profilesService.getProfileCompletion(id);
  }

  @Post(':id/avatar')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiParam({ name: 'id', description: 'User ID' })
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
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (id !== currentUserId) {
      return { message: 'You can only upload avatar for your own profile' };
    }
    return this.profilesService.uploadAvatar(id, file);
  }

  @Post('initialize')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize profile if it does not exist' })
  @ApiResponse({ status: 200, description: 'Profile initialized or already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initializeProfile(
    @CurrentUser('userId') currentUserId: string,
    @Body() body?: { email?: string; fullName?: string },
  ) {
    try {
      // Try to get existing profile
      const existingProfile = await this.profilesService.findOne(currentUserId);
      return existingProfile;
    } catch (error) {
      // Profile not found, create minimal profile
      const email = body?.email || '';
      const createProfileDto: CreateProfileDto = {
        userId: currentUserId,
        email: email,
        fullName: body?.fullName || email.split('@')[0] || 'User',
        username: null,
        phone: null,
        bio: null,
        location: null,
        website: null,
        userType: null,
      };
      return this.profilesService.create(createProfileDto);
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search profiles' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'userType', description: 'User type filter', required: false })
  @ApiQuery({ name: 'limit', description: 'Results limit', required: false })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('userType') userType?: string,
    @Query('limit') limit?: number,
  ) {
    return this.profilesService.searchProfiles(query, userType, limit);
  }
}
