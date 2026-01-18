import { apiClient } from '../../../core/api';
import { CollaborationReview } from '../../../core/types';

export interface ReviewUserProfile {
  id: string;
  fullName: string;
  username?: string;
  avatar?: string;
}

export interface ReviewWithProfile extends CollaborationReview {
  reviewer?: ReviewUserProfile;
  reviewed?: ReviewUserProfile;
}

export interface UserRatingStats {
  averageRating: number;
  totalReviews: number;
  ratings: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

class ReviewsService {
  async getReceivedReviews(userId: string): Promise<ReviewWithProfile[]> {
    try {
      const reviews = await apiClient.get<ReviewWithProfile[]>(`/reviews/user/${userId}/received`);
      console.log('[ReviewsService] Received reviews loaded:', reviews.length);
      return reviews;
    } catch (error) {
      console.error('[ReviewsService] Failed to load received reviews:', error);
      throw error;
    }
  }

  async getGivenReviews(userId: string): Promise<ReviewWithProfile[]> {
    try {
      const reviews = await apiClient.get<ReviewWithProfile[]>(`/reviews/user/${userId}/given`);
      console.log('[ReviewsService] Given reviews loaded:', reviews.length);
      return reviews;
    } catch (error) {
      console.error('[ReviewsService] Failed to load given reviews:', error);
      throw error;
    }
  }

  async getUserRating(userId: string): Promise<UserRatingStats> {
    try {
      const rating = await apiClient.get<UserRatingStats>(`/reviews/user/${userId}/rating`);
      console.log('[ReviewsService] User rating loaded:', rating);
      return rating;
    } catch (error) {
      console.error('[ReviewsService] Failed to load user rating:', error);
      throw error;
    }
  }

  async createReview(reviewData: {
    dealId: string;
    collaborationType: 'application' | 'offer';
    revieweeId: string;
    rating: number;
    title?: string;
    comment: string;
  }): Promise<CollaborationReview> {
    try {
      const review = await apiClient.post<CollaborationReview>('/reviews', reviewData);
      console.log('[ReviewsService] Review created:', review.id);
      return review;
    } catch (error) {
      console.error('[ReviewsService] Failed to create review:', error);
      throw error;
    }
  }

  async canReview(dealId: string, collaborationType: string): Promise<boolean> {
    try {
      const response = await apiClient.get<{ canReview: boolean }>(
        `/reviews/can-review?dealId=${dealId}&collaborationType=${collaborationType}`
      );
      return response.canReview;
    } catch (error) {
      console.error('[ReviewsService] Failed to check review permission:', error);
      return false;
    }
  }
}

export const reviewsService = new ReviewsService();
