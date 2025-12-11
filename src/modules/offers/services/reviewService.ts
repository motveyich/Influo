import { supabase } from '../../../core/supabase';
import { CollaborationReview } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ReviewService {
  private transformReview(data: any): CollaborationReview {
    return {
      id: data.id,
      offerId: data.offer_id,
      reviewerId: data.reviewer_id,
      revieweeId: data.reviewee_id,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      isPublic: data.is_public,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createReview(reviewData: Partial<CollaborationReview>): Promise<CollaborationReview> {
    try {
      this.validateReviewData(reviewData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          offer_id: reviewData.offerId,
          reviewer_id: user.id,
          reviewee_id: reviewData.revieweeId,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          is_public: reviewData.isPublic ?? true,
          metadata: reviewData.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      const review = this.transformReview(data);

      analytics.track('collaboration_review_created', {
        review_id: review.id,
        deal_id: reviewData.offerId,
        rating: reviewData.rating,
        reviewer_id: user.id
      });

      return review;
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  }

  async getReviews(userId: string): Promise<CollaborationReview[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => this.transformReview(item));
    } catch (error) {
      console.error('Failed to get reviews:', error);
      throw error;
    }
  }

  async getReview(reviewId: string): Promise<CollaborationReview> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (error) throw error;

      return this.transformReview(data);
    } catch (error) {
      console.error('Failed to get review:', error);
      throw error;
    }
  }

  async canReview(offerId: string, userId: string): Promise<boolean> {
    try {
      const { data: offer } = await supabase
        .from('offers')
        .select('status, influencer_id, advertiser_id')
        .eq('id', offerId)
        .maybeSingle();

      if (!offer || offer.status !== 'completed') return false;

      const isParticipant = offer.influencer_id === userId || offer.advertiser_id === userId;
      if (!isParticipant) return false;

      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('offer_id', offerId)
        .eq('reviewer_id', userId)
        .maybeSingle();

      return !existingReview;
    } catch (error) {
      console.error('Failed to check review permission:', error);
      return false;
    }
  }

  private validateReviewData(reviewData: Partial<CollaborationReview>): void {
    if (!reviewData.offerId || !reviewData.revieweeId) {
      throw new Error('Offer ID and reviewee ID are required');
    }
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    if (!reviewData.comment || reviewData.comment.trim().length < 10) {
      throw new Error('Comment must be at least 10 characters');
    }
  }
}

export const reviewService = new ReviewService();
