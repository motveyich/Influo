import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id, status')
      .eq('id', createReviewDto.offerId)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'completed') {
      throw new BadRequestException('Can only review completed offers');
    }

    const isParticipant = offer.advertiser_id === userId || offer.influencer_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('You can only review offers you participated in');
    }

    if (createReviewDto.reviewedUserId === userId) {
      throw new BadRequestException('Cannot review yourself');
    }

    const validReviewedUser = offer.advertiser_id === createReviewDto.reviewedUserId ||
                               offer.influencer_id === createReviewDto.reviewedUserId;
    if (!validReviewedUser) {
      throw new BadRequestException('Reviewed user must be part of the offer');
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('offer_id', createReviewDto.offerId)
      .eq('reviewer_id', userId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('You have already reviewed this offer');
    }

    const reviewData = {
      offer_id: createReviewDto.offerId,
      reviewer_id: userId,
      reviewed_user_id: createReviewDto.reviewedUserId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      created_at: new Date().toISOString(),
    };

    const { data: review, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create review: ${error.message}`, error);
      throw new ConflictException('Failed to create review');
    }

    await this.updateUserRating(createReviewDto.reviewedUserId);

    return this.transformReview(review);
  }

  async findAll(userId?: string) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:user_profiles!reviews_reviewer_id_fkey(*),
        reviewed:user_profiles!reviews_reviewed_user_id_fkey(*)
      `);

    if (userId) {
      query = query.eq('reviewed_user_id', userId);
    }

    const { data: reviews, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch reviews: ${error.message}`, error);
      return [];
    }

    return reviews.map((review) => this.transformReview(review));
  }

  async findByUser(userId: string) {
    return this.findAll(userId);
  }

  async getUserRating(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_user_id', userId);

    if (error || !reviews || reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalReviews = reviews.length;
    const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = sumRating / totalReviews;

    const ratings = reviews.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratings: {
        1: ratings[1] || 0,
        2: ratings[2] || 0,
        3: ratings[3] || 0,
        4: ratings[4] || 0,
        5: ratings[5] || 0,
      },
    };
  }

  private async updateUserRating(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const ratingData = await this.getUserRating(userId);

    await supabase
      .from('user_profiles')
      .update({
        rating: ratingData.averageRating,
        reviews_count: ratingData.totalReviews,
      })
      .eq('user_id', userId);
  }

  private transformReview(review: any) {
    return {
      id: review.id,
      offerId: review.offer_id,
      reviewerId: review.reviewer_id,
      reviewedUserId: review.reviewed_user_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      reviewer: review.reviewer ? {
        id: review.reviewer.user_id,
        fullName: review.reviewer.full_name,
        username: review.reviewer.username,
        avatar: review.reviewer.avatar,
      } : undefined,
      reviewed: review.reviewed ? {
        id: review.reviewed.user_id,
        fullName: review.reviewed.full_name,
        username: review.reviewed.username,
        avatar: review.reviewed.avatar,
      } : undefined,
    };
  }
}
