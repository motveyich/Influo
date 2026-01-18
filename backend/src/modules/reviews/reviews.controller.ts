import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  @ApiResponse({ status: 400, description: 'Can only review completed offers' })
  @ApiResponse({ status: 409, description: 'Already reviewed this offer' })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reviewsService.create(userId, createReviewDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async findAll() {
    return this.reviewsService.findAll();
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of user reviews' })
  async findByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  @Get('user/:userId/received')
  @Public()
  @ApiOperation({ summary: 'Get reviews received by a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of received reviews' })
  async findReceivedReviews(@Param('userId') userId: string) {
    return this.reviewsService.findReceivedReviews(userId);
  }

  @Get('user/:userId/given')
  @Public()
  @ApiOperation({ summary: 'Get reviews given by a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of given reviews' })
  async findGivenReviews(@Param('userId') userId: string) {
    return this.reviewsService.findGivenReviews(userId);
  }

  @Get('user/:userId/rating')
  @Public()
  @ApiOperation({ summary: 'Get user rating statistics' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User rating statistics' })
  async getUserRating(@Param('userId') userId: string) {
    return this.reviewsService.getUserRating(userId);
  }

  @Get('deal/:dealId')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a specific deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID (Offer or Application ID)' })
  @ApiResponse({ status: 200, description: 'List of deal reviews' })
  async findByDeal(
    @Param('dealId') dealId: string,
    @Query('collaborationType') collaborationType: string,
  ) {
    return this.reviewsService.findByDeal(dealId, collaborationType);
  }

  @Get('can-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if user can review a deal' })
  @ApiResponse({ status: 200, description: 'Can review status' })
  async canReview(
    @Query('dealId') dealId: string,
    @Query('collaborationType') collaborationType: string,
    @CurrentUser('userId') userId: string,
  ) {
    const canReview = await this.reviewsService.canReview(dealId, userId, collaborationType);
    return { canReview };
  }
}
