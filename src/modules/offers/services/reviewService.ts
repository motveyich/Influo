import { apiClient } from '../../../core/api';
import { CollaborationReview } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ReviewService {
  async createReview(reviewData: Partial<CollaborationReview>): Promise<CollaborationReview> {
    try {
      this.validateReviewData(reviewData);

      const payload = {
        dealId: reviewData.dealId,
        collaborationType: reviewData.collaborationType || 'application',
        revieweeId: reviewData.revieweeId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
      };

      const review = await apiClient.post<CollaborationReview>('/reviews', payload);

      analytics.track('collaboration_review_created', {
        review_id: review.id,
        deal_id: reviewData.dealId,
        collaboration_type: reviewData.collaborationType,
        rating: reviewData.rating,
        reviewer_id: reviewData.reviewerId
      });

      return review;
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  }

  async getUserReviews(userId: string): Promise<CollaborationReview[]> {
    try {
      return await apiClient.get<CollaborationReview[]>(`/reviews/user/${userId}`);
    } catch (error) {
      console.error('Failed to get user reviews:', error);
      throw error;
    }
  }

  async getOfferReviews(dealId: string, collaborationType: string = 'application'): Promise<CollaborationReview[]> {
    try {
      return await apiClient.get<CollaborationReview[]>(
        `/reviews/deal/${dealId}?collaborationType=${collaborationType}`
      );
    } catch (error) {
      console.error('Failed to get offer reviews:', error);
      throw error;
    }
  }

  async getReview(reviewId: string): Promise<CollaborationReview> {
    try {
      return await apiClient.get<CollaborationReview>(`/reviews/${reviewId}`);
    } catch (error) {
      console.error('Failed to get review:', error);
      throw error;
    }
  }

  async canUserReview(dealId: string, userId: string, collaborationType: string = 'application'): Promise<boolean> {
    try {
      const response = await apiClient.get<{ canReview: boolean }>(
        `/reviews/can-review?dealId=${dealId}&collaborationType=${collaborationType}`
      );
      return response.canReview;
    } catch (error) {
      console.error('Failed to check review permission:', error);
      return false;
    }
  }

  private validateReviewData(reviewData: Partial<CollaborationReview>): void {
    if (!reviewData.dealId || !reviewData.revieweeId) {
      throw new Error('Deal ID and reviewee ID are required');
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
