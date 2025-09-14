import { supabase, TABLES } from '../../../core/supabase';
import { CollaborationReview } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ReviewService {
  async createReview(reviewData: Partial<CollaborationReview>): Promise<CollaborationReview> {
    try {
      this.validateReviewData(reviewData);

      const newReview = {
        offer_id: reviewData.offerId,
        reviewer_id: reviewData.reviewerId,
        reviewee_id: reviewData.revieweeId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        is_public: reviewData.isPublic ?? true,
        helpful_votes: 0,
        metadata: reviewData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_REVIEWS)
        .insert([newReview])
        .select()
        .single();

      if (error) throw error;

      const transformedReview = this.transformFromDatabase(data);

      // Update offer review status
      await this.updateOfferReviewStatus(reviewData.offerId!, reviewData.reviewerId!);

      // Track analytics
      analytics.track('collaboration_review_created', {
        review_id: transformedReview.id,
        offer_id: reviewData.offerId,
        rating: reviewData.rating,
        reviewer_id: reviewData.reviewerId
      });

      return transformedReview;
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  }

  async getOfferReviews(offerId: string): Promise<CollaborationReview[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_REVIEWS)
        .select(`
          *,
          reviewer:user_profiles!reviewer_id(full_name, avatar),
          reviewee:user_profiles!reviewee_id(full_name, avatar)
        `)
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(review => this.transformFromDatabase(review));
    } catch (error) {
      console.error('Failed to get offer reviews:', error);
      throw error;
    }
  }

  async getUserReviews(userId: string, type: 'given' | 'received'): Promise<CollaborationReview[]> {
    try {
      const column = type === 'given' ? 'reviewer_id' : 'reviewee_id';
      
      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_REVIEWS)
        .select(`
          *,
          reviewer:user_profiles!reviewer_id(full_name, avatar),
          reviewee:user_profiles!reviewee_id(full_name, avatar)
        `)
        .eq(column, userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(review => this.transformFromDatabase(review));
    } catch (error) {
      console.error('Failed to get user reviews:', error);
      throw error;
    }
  }

  async canUserReview(offerId: string, userId: string): Promise<boolean> {
    try {
      // Check if offer is completed or terminated
      const { data: offer } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .select('status, influencer_id, advertiser_id, influencer_reviewed, advertiser_reviewed')
        .eq('id', offerId)
        .single();

      if (!offer || !['completed', 'terminated'].includes(offer.status)) {
        return false;
      }

      // Check if user is participant
      if (userId !== offer.influencer_id && userId !== offer.advertiser_id) {
        return false;
      }

      // Check if user already reviewed
      if (userId === offer.influencer_id && offer.influencer_reviewed) {
        return false;
      }

      if (userId === offer.advertiser_id && offer.advertiser_reviewed) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check review permission:', error);
      return false;
    }
  }

  private async updateOfferReviewStatus(offerId: string, reviewerId: string): Promise<void> {
    try {
      // Get offer to determine which review flag to update
      const { data: offer } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .select('influencer_id, advertiser_id')
        .eq('id', offerId)
        .single();

      if (!offer) return;

      const updateField = reviewerId === offer.influencer_id ? 'influencer_reviewed' : 'advertiser_reviewed';

      await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .update({ [updateField]: true })
        .eq('id', offerId);
    } catch (error) {
      console.error('Failed to update offer review status:', error);
    }
  }

  private validateReviewData(reviewData: Partial<CollaborationReview>): void {
    const errors: string[] = [];

    if (!reviewData.offerId) errors.push('Offer ID is required');
    if (!reviewData.reviewerId) errors.push('Reviewer ID is required');
    if (!reviewData.revieweeId) errors.push('Reviewee ID is required');
    if (reviewData.reviewerId === reviewData.revieweeId) errors.push('Cannot review yourself');
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) errors.push('Rating must be between 1 and 5');
    if (!reviewData.title?.trim()) errors.push('Review title is required');
    if (!reviewData.comment?.trim()) errors.push('Review comment is required');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): CollaborationReview {
    return {
      id: dbData.id,
      offerId: dbData.offer_id,
      reviewerId: dbData.reviewer_id,
      revieweeId: dbData.reviewee_id,
      rating: parseFloat(dbData.rating),
      title: dbData.title,
      comment: dbData.comment,
      isPublic: dbData.is_public,
      helpfulVotes: dbData.helpful_votes,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const reviewService = new ReviewService();