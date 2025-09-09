import { supabase } from '../core/supabase';
import { analytics } from '../core/analytics';

export type PaymentType = 'full_prepay' | 'partial_prepay_postpay' | 'postpay';
export type DealStatus = 'created' | 'payment_configured' | 'prepay_pending' | 'prepay_confirmed' | 'work_in_progress' | 'work_completed' | 'postpay_pending' | 'postpay_confirmed' | 'completed' | 'cancelled' | 'disputed';

export interface Deal {
  id: string;
  offerId?: string;
  applicationId?: string;
  payerId: string;
  payeeId: string;
  totalAmount: number;
  currency: string;
  paymentType: PaymentType;
  prepayAmount: number;
  postpayAmount: number;
  paymentDetails: Record<string, any>;
  dealStatus: DealStatus;
  prepayConfirmedByPayer: boolean;
  prepayConfirmedByPayee: boolean;
  postpayConfirmedByPayer: boolean;
  postpayConfirmedByPayee: boolean;
  workDetails: Record<string, any>;
  deliverablesConfirmed: boolean;
  completionConfirmedByBoth: boolean;
  disputeReason?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  title: string;
  comment: string;
  collaborationType: 'as_influencer' | 'as_advertiser';
  isPublic: boolean;
  helpfulVotes: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfirmation {
  id: string;
  dealId: string;
  paymentStage: 'prepay' | 'postpay';
  confirmedBy: string;
  confirmationType: 'payment_sent' | 'payment_received';
  amount: number;
  confirmationDetails: Record<string, any>;
  confirmedAt: string;
}

export class DealService {
  async createDeal(dealData: Partial<Deal>): Promise<Deal> {
    try {
      this.validateDealData(dealData);

      const newDeal = {
        offer_id: dealData.offerId || null,
        application_id: dealData.applicationId || null,
        payer_id: dealData.payerId,
        payee_id: dealData.payeeId,
        total_amount: dealData.totalAmount,
        currency: dealData.currency || 'USD',
        payment_type: dealData.paymentType || 'full_prepay',
        prepay_amount: dealData.prepayAmount || 0,
        postpay_amount: dealData.postpayAmount || 0,
        payment_details: dealData.paymentDetails || {},
        deal_status: 'created',
        work_details: dealData.workDetails || {},
        metadata: dealData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Calculate prepay/postpay amounts based on payment type
      if (dealData.paymentType === 'full_prepay') {
        newDeal.prepay_amount = dealData.totalAmount!;
        newDeal.postpay_amount = 0;
      } else if (dealData.paymentType === 'partial_prepay_postpay') {
        newDeal.prepay_amount = dealData.prepayAmount || (dealData.totalAmount! * 0.5);
        newDeal.postpay_amount = dealData.totalAmount! - newDeal.prepay_amount;
      } else {
        newDeal.prepay_amount = 0;
        newDeal.postpay_amount = dealData.totalAmount!;
      }

      const { data, error } = await supabase
        .from('deals')
        .insert([newDeal])
        .select()
        .single();

      if (error) throw error;

      // Track deal creation
      analytics.track('deal_created', {
        deal_id: data.id,
        payer_id: dealData.payerId,
        payee_id: dealData.payeeId,
        payment_type: dealData.paymentType,
        total_amount: dealData.totalAmount
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to create deal:', error);
      throw error;
    }
  }

  async configureDealPayment(
    dealId: string,
    paymentType: PaymentType,
    paymentDetails: Record<string, any>,
    prepayPercentage?: number
  ): Promise<Deal> {
    try {
      const deal = await this.getDeal(dealId);
      if (!deal) throw new Error('Deal not found');

      let prepayAmount = 0;
      let postpayAmount = 0;

      if (paymentType === 'full_prepay') {
        prepayAmount = deal.totalAmount;
        postpayAmount = 0;
      } else if (paymentType === 'partial_prepay_postpay') {
        const percentage = prepayPercentage || 50;
        prepayAmount = Math.round(deal.totalAmount * (percentage / 100));
        postpayAmount = deal.totalAmount - prepayAmount;
      } else {
        prepayAmount = 0;
        postpayAmount = deal.totalAmount;
      }

      const { data, error } = await supabase
        .from('deals')
        .update({
          payment_type: paymentType,
          prepay_amount: prepayAmount,
          postpay_amount: postpayAmount,
          payment_details: paymentDetails,
          deal_status: 'payment_configured',
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to configure deal payment:', error);
      throw error;
    }
  }

  async confirmPayment(
    dealId: string,
    paymentStage: 'prepay' | 'postpay',
    confirmationType: 'payment_sent' | 'payment_received',
    confirmedBy: string,
    confirmationDetails: Record<string, any> = {}
  ): Promise<Deal> {
    try {
      const deal = await this.getDeal(dealId);
      if (!deal) throw new Error('Deal not found');

      // Create confirmation record
      await supabase
        .from('payment_confirmations')
        .insert([{
          deal_id: dealId,
          payment_stage: paymentStage,
          confirmed_by: confirmedBy,
          confirmation_type: confirmationType,
          amount: paymentStage === 'prepay' ? deal.prepayAmount : deal.postpayAmount,
          confirmation_details: confirmationDetails,
          confirmed_at: new Date().toISOString()
        }]);

      // Update deal confirmation flags
      const updateData: any = { updated_at: new Date().toISOString() };

      if (paymentStage === 'prepay') {
        if (confirmationType === 'payment_sent') {
          updateData.prepay_confirmed_by_payer = true;
          updateData.deal_status = 'prepay_pending';
        } else {
          updateData.prepay_confirmed_by_payee = true;
          // If both confirmed prepay, move to next stage
          if (deal.prepayConfirmedByPayer) {
            updateData.deal_status = deal.paymentType === 'full_prepay' ? 'work_in_progress' : 'work_in_progress';
          }
        }
      } else {
        if (confirmationType === 'payment_sent') {
          updateData.postpay_confirmed_by_payer = true;
          updateData.deal_status = 'postpay_pending';
        } else {
          updateData.postpay_confirmed_by_payee = true;
          // If both confirmed postpay, complete deal
          if (deal.postpayConfirmedByPayer) {
            updateData.deal_status = 'completed';
          }
        }
      }

      const { data, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;

      // Track payment confirmation
      analytics.track('payment_confirmed', {
        deal_id: dealId,
        payment_stage: paymentStage,
        confirmation_type: confirmationType,
        confirmed_by: confirmedBy
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      throw error;
    }
  }

  async markWorkCompleted(dealId: string, userId: string, workDetails: Record<string, any>): Promise<Deal> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .update({
          deal_status: 'work_completed',
          work_details: workDetails,
          deliverables_confirmed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to mark work completed:', error);
      throw error;
    }
  }

  async getDeal(dealId: string): Promise<Deal | null> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      // Если таблица deals не существует, возвращаем null
      if (error?.code === '42P01') {
        console.log('Deals table not yet created');
        return null;
      }
      console.error('Failed to get deal:', error);
      throw error;
    }
  }

  async getUserDeals(userId: string): Promise<Deal[]> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(deal => this.transformFromDatabase(deal));
    } catch (error) {
      // Если таблица deals не существует, возвращаем пустой массив
      if (error?.code === '42P01') {
        console.log('Deals table not yet created');
        return [];
      }
      console.error('Failed to get user deals:', error);
      throw error;
    }
  }

  async createReview(reviewData: Partial<Review>): Promise<Review> {
    try {
      this.validateReviewData(reviewData);

      const newReview = {
        deal_id: reviewData.dealId,
        reviewer_id: reviewData.reviewerId,
        reviewee_id: reviewData.revieweeId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        collaboration_type: reviewData.collaborationType,
        is_public: reviewData.isPublic ?? true,
        helpful_votes: 0,
        metadata: reviewData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('reviews')
        .insert([newReview])
        .select()
        .single();

      if (error) throw error;

      // Track review creation
      analytics.track('review_created', {
        deal_id: reviewData.dealId,
        reviewer_id: reviewData.reviewerId,
        reviewee_id: reviewData.revieweeId,
        rating: reviewData.rating,
        collaboration_type: reviewData.collaborationType
      });

      return this.transformReviewFromDatabase(data);
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  }

  async getUserReviews(userId: string, asReviewer: boolean = false): Promise<Review[]> {
    try {
      const column = asReviewer ? 'reviewer_id' : 'reviewee_id';
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq(column, userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(review => this.transformReviewFromDatabase(review));
    } catch (error) {
      // Если таблица reviews не существует, возвращаем пустой массив
      if (error?.code === '42P01') {
        console.log('Reviews table not yet created');
        return [];
      }
      console.error('Failed to get user reviews:', error);
      throw error;
    }
  }

  async getUserRating(userId: string): Promise<{ rating: number; totalReviews: number }> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', userId)
        .eq('is_public', true);

      if (error) throw error;

      const totalReviews = data.length;
      const averageRating = totalReviews > 0 
        ? data.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;

      return {
        rating: Number(averageRating.toFixed(1)),
        totalReviews
      };
    } catch (error) {
      // Если таблица reviews не существует, возвращаем значения по умолчанию
      if (error?.code === '42P01') {
        console.log('Reviews table not yet created');
        return { rating: 0, totalReviews: 0 };
      }
      console.error('Failed to get user rating:', error);
      return { rating: 0, totalReviews: 0 };
    }
  }

  private validateDealData(dealData: Partial<Deal>): void {
    const errors: string[] = [];

    if (!dealData.payerId) errors.push('Payer ID is required');
    if (!dealData.payeeId) errors.push('Payee ID is required');
    if (dealData.payerId === dealData.payeeId) errors.push('Payer and payee cannot be the same');
    if (!dealData.totalAmount || dealData.totalAmount <= 0) errors.push('Valid total amount is required');
    if (!dealData.paymentType) errors.push('Payment type is required');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private validateReviewData(reviewData: Partial<Review>): void {
    const errors: string[] = [];

    if (!reviewData.dealId) errors.push('Deal ID is required');
    if (!reviewData.reviewerId) errors.push('Reviewer ID is required');
    if (!reviewData.revieweeId) errors.push('Reviewee ID is required');
    if (reviewData.reviewerId === reviewData.revieweeId) errors.push('Reviewer and reviewee cannot be the same');
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) errors.push('Rating must be between 1 and 5');
    if (!reviewData.title?.trim()) errors.push('Review title is required');
    if (!reviewData.comment?.trim()) errors.push('Review comment is required');
    if (!reviewData.collaborationType) errors.push('Collaboration type is required');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): Deal {
    return {
      id: dbData.id,
      offerId: dbData.offer_id,
      applicationId: dbData.application_id,
      payerId: dbData.payer_id,
      payeeId: dbData.payee_id,
      totalAmount: Number(dbData.total_amount),
      currency: dbData.currency,
      paymentType: dbData.payment_type,
      prepayAmount: Number(dbData.prepay_amount),
      postpayAmount: Number(dbData.postpay_amount),
      paymentDetails: dbData.payment_details || {},
      dealStatus: dbData.deal_status,
      prepayConfirmedByPayer: dbData.prepay_confirmed_by_payer,
      prepayConfirmedByPayee: dbData.prepay_confirmed_by_payee,
      postpayConfirmedByPayer: dbData.postpay_confirmed_by_payer,
      postpayConfirmedByPayee: dbData.postpay_confirmed_by_payee,
      workDetails: dbData.work_details || {},
      deliverablesConfirmed: dbData.deliverables_confirmed,
      completionConfirmedByBoth: dbData.completion_confirmed_by_both,
      disputeReason: dbData.dispute_reason,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformReviewFromDatabase(dbData: any): Review {
    return {
      id: dbData.id,
      dealId: dbData.deal_id,
      reviewerId: dbData.reviewer_id,
      revieweeId: dbData.reviewee_id,
      rating: Number(dbData.rating),
      title: dbData.title,
      comment: dbData.comment,
      collaborationType: dbData.collaboration_type,
      isPublic: dbData.is_public,
      helpfulVotes: dbData.helpful_votes,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const dealService = new DealService();