import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const supabase = this.supabaseService.getAdminClient();

    let collaboration: any;
    let tableName: string;

    if (createReviewDto.collaborationType === 'application') {
      tableName = 'applications';
      const { data } = await supabase
        .from('applications')
        .select('applicant_id, target_id, status')
        .eq('id', createReviewDto.dealId)
        .maybeSingle();
      collaboration = data ? {
        advertiser_id: data.target_id,
        influencer_id: data.applicant_id,
        status: data.status
      } : null;
    } else {
      tableName = 'offers';
      const { data } = await supabase
        .from('offers')
        .select('advertiser_id, influencer_id, status')
        .eq('offer_id', createReviewDto.dealId)
        .maybeSingle();
      collaboration = data;
    }

    if (!collaboration) {
      throw new NotFoundException(`${createReviewDto.collaborationType} not found`);
    }

    if (collaboration.status !== 'completed') {
      throw new BadRequestException(`Can only review completed ${createReviewDto.collaborationType}s`);
    }

    const isParticipant = collaboration.advertiser_id === userId || collaboration.influencer_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException(`You can only review ${createReviewDto.collaborationType}s you participated in`);
    }

    if (createReviewDto.revieweeId === userId) {
      throw new BadRequestException('Cannot review yourself');
    }

    const validReviewedUser = collaboration.advertiser_id === createReviewDto.revieweeId ||
                               collaboration.influencer_id === createReviewDto.revieweeId;
    if (!validReviewedUser) {
      throw new BadRequestException(`Reviewed user must be part of the ${createReviewDto.collaborationType}`);
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('deal_id', createReviewDto.dealId)
      .eq('reviewer_id', userId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`You have already reviewed this ${createReviewDto.collaborationType}`);
    }

    const reviewData = {
      deal_id: createReviewDto.dealId,
      reviewer_id: userId,
      reviewee_id: createReviewDto.revieweeId,
      rating: createReviewDto.rating,
      title: createReviewDto.title || 'Review',
      comment: createReviewDto.comment,
      collaboration_type: createReviewDto.collaborationType,
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

    await this.updateUserRating(createReviewDto.revieweeId);

    return this.transformReview(review);
  }

  async findAll(userId?: string) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:user_profiles!reviews_reviewer_id_fkey(*),
        reviewed:user_profiles!reviews_reviewee_id_fkey(*)
      `);

    if (userId) {
      query = query.eq('reviewee_id', userId);
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

  async findByDeal(dealId: string, collaborationType: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:user_profiles!reviews_reviewer_id_fkey(*),
        reviewed:user_profiles!reviews_reviewee_id_fkey(*)
      `)
      .eq('deal_id', dealId)
      .eq('collaboration_type', collaborationType)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch reviews for deal: ${error.message}`, error);
      return [];
    }

    return reviews.map((review) => this.transformReview(review));
  }

  async canReview(dealId: string, userId: string, collaborationType: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();

    let collaboration: any;

    if (collaborationType === 'application') {
      const { data } = await supabase
        .from('applications')
        .select('applicant_id, target_id, status')
        .eq('id', dealId)
        .maybeSingle();
      collaboration = data ? {
        advertiser_id: data.target_id,
        influencer_id: data.applicant_id,
        status: data.status
      } : null;
    } else {
      const { data } = await supabase
        .from('offers')
        .select('advertiser_id, influencer_id, status')
        .eq('offer_id', dealId)
        .maybeSingle();
      collaboration = data;
    }

    if (!collaboration) {
      return false;
    }

    if (collaboration.status !== 'completed') {
      return false;
    }

    const isParticipant = collaboration.advertiser_id === userId || collaboration.influencer_id === userId;
    if (!isParticipant) {
      return false;
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('deal_id', dealId)
      .eq('reviewer_id', userId)
      .maybeSingle();

    return !existing;
  }

  async getUserRating(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

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
      dealId: review.deal_id,
      collaborationType: review.collaboration_type,
      reviewerId: review.reviewer_id,
      revieweeId: review.reviewee_id,
      rating: review.rating,
      title: review.title,
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
