import { apiClient } from '../../../core/api';
import { CollaborationReview } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ReviewService {
  async createReview(reviewData: Partial<CollaborationReview>): Promise<CollaborationReview> {
    try {
      this.validateReviewData(reviewData);

      const payload = {
        offerId: reviewData.offerId,
        revieweeId: reviewData.revieweeId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        isPublic: reviewData.isPublic ?? true,
        metadata: reviewData.metadata || {},
      };

      const review = await apiClient.post<CollaborationReview>('/reviews', payload);

      analytics.track('collaboration_review_created', {
        review_id: review.id,
        deal_id: reviewData.offerId,
        rating: reviewData.rating,
        reviewer_id: reviewData.reviewerId
      });

      return review;
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  }

  async getReviews(userId: string): Promise<CollaborationReview[]> {
    try {
      const reviews = await apiClient.get<CollaborationReview[]>(`/reviews?userId=${userId}`);
      return Array.isArray(reviews) ? reviews : [];
    } catch (error) {
      console.error('Failed to get reviews:', error);
      return [];
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

  async canReview(offerId: string, userId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<{ canReview: boolean }>(
        `/reviews/can-review?offerId=${offerId}&userId=${userId}`
      );
      return response.canReview;
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
