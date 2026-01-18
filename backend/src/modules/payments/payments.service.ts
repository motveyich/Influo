import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreatePaymentRequestDto, UpdatePaymentRequestDto } from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async createPaymentRequest(userId: string, createDto: CreatePaymentRequestDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id, status, details')
      .eq('offer_id', createDto.offerId)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const offerDetails = offer.details || {};
    const proposedRate = offerDetails.proposed_rate || 0;
    const offerCurrency = offerDetails.currency || 'RUB';

    const { data: existing } = await supabase
      .from('payment_requests')
      .select('id')
      .eq('offer_id', createDto.offerId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Payment request already exists for this offer');
    }

    const paymentData = {
      offer_id: createDto.offerId,
      created_by: userId,
      amount: createDto.amount,
      currency: createDto.currency,
      payment_type: createDto.paymentType,
      payment_method: createDto.paymentMethod,
      payment_details: createDto.paymentDetails || {},
      instructions: createDto.instructions,
      status: 'draft',
    };

    const { data: payment, error } = await supabase
      .from('payment_requests')
      .insert(paymentData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create payment request: ${error.message}`, error);
      throw new ConflictException('Failed to create payment request');
    }

    return this.transformPayment(payment);
  }

  async findAll(userId: string, filters?: { status?: string; asAdvertiser?: boolean; offerId?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('payment_requests')
      .select('*, offer:offers(*)');

    if (filters?.offerId) {
      const { data: offer } = await supabase
        .from('offers')
        .select('advertiser_id, influencer_id')
        .eq('offer_id', filters.offerId)
        .maybeSingle();

      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      if (offer.advertiser_id !== userId && offer.influencer_id !== userId) {
        throw new ForbiddenException('You do not have access to this offer');
      }

      query = query.eq('offer_id', filters.offerId);
    } else {
      query = query.eq('created_by', userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: payments, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch payment requests: ${error.message}`, error);
      return [];
    }

    return payments.map((payment) => this.transformPayment(payment));
  }

  async findOne(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: payment, error } = await supabase
      .from('payment_requests')
      .select('*, offer:offers(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !payment) {
      throw new NotFoundException('Payment request not found');
    }

    const offer = payment.offer;
    if (!offer) {
      throw new NotFoundException('Associated offer not found');
    }

    const isAdvertiser = offer.advertiser_id === userId;
    const isInfluencer = offer.influencer_id === userId;

    if (!isAdvertiser && !isInfluencer) {
      throw new ForbiddenException('You are not a participant in this offer');
    }

    return this.transformPayment(payment);
  }

  async approve(id: string, userId: string, updateDto: UpdatePaymentRequestDto) {
    return this.updateStatus(id, userId, 'approved', 'advertiser', updateDto);
  }

  async reject(id: string, userId: string, updateDto: UpdatePaymentRequestDto) {
    return this.updateStatus(id, userId, 'rejected', 'advertiser', updateDto);
  }

  async markAsPaid(id: string, userId: string, updateDto: UpdatePaymentRequestDto) {
    return this.updateStatus(id, userId, 'paid', 'advertiser', updateDto);
  }

  async cancel(id: string, userId: string) {
    return this.updateStatus(id, userId, 'cancelled', 'influencer', {});
  }

  async updatePaymentStatus(id: string, userId: string, status: string) {
    return this.updateStatus(id, userId, status, 'influencer', {});
  }

  private async updateStatus(
    id: string,
    userId: string,
    status: string,
    requiredRole: 'advertiser' | 'influencer',
    updateDto: UpdatePaymentRequestDto,
  ) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: payment } = await supabase
      .from('payment_requests')
      .select('created_by, status, offer_id, offer:offers(advertiser_id, influencer_id)')
      .eq('id', id)
      .maybeSingle();

    if (!payment) {
      throw new NotFoundException('Payment request not found');
    }

    const offer = payment.offer;
    if (!offer) {
      throw new NotFoundException('Associated offer not found');
    }

    const isAdvertiser = offer.advertiser_id === userId;
    const isInfluencer = offer.influencer_id === userId;

    if (!isAdvertiser && !isInfluencer) {
      throw new ForbiddenException('You are not a participant in this offer');
    }

    const userRole = isAdvertiser ? 'advertiser' : 'influencer';

    const influencerTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['cancelled'],
      paying: ['cancelled'],
      paid: ['confirmed', 'cancelled'],
      confirmed: [],
      failed: ['cancelled'],
      cancelled: [],
    };

    const advertiserTransitions: Record<string, string[]> = {
      draft: ['cancelled'],
      pending: ['paying', 'failed', 'cancelled'],
      paying: ['paid', 'failed', 'cancelled'],
      paid: ['cancelled'],
      confirmed: [],
      failed: ['pending', 'cancelled'],
      cancelled: [],
    };

    const validTransitions = userRole === 'influencer' ? influencerTransitions : advertiserTransitions;

    if (!validTransitions[payment.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${payment.status} to ${status} as ${userRole}`);
    }

    const updateData: any = {
      status,
    };

    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
      updateData.confirmed_by = userId;
    }

    const { data: updated, error } = await supabase
      .from('payment_requests')
      .update(updateData)
      .eq('id', id)
      .select('*, offer:offers(*)')
      .single();

    if (error) {
      this.logger.error(`Failed to update payment request: ${error.message}`, error);
      throw new ConflictException('Failed to update payment request');
    }

    return this.transformPayment(updated);
  }

  async getPaymentStatistics(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: payments } = await supabase
      .from('payment_requests')
      .select('status, amount, currency')
      .eq('created_by', userId);

    if (!payments || payments.length === 0) {
      return {
        totalRequested: 0,
        totalPaid: 0,
        totalConfirmed: 0,
        draftCount: 0,
        pendingCount: 0,
        paidCount: 0,
        confirmedCount: 0,
      };
    }

    const stats = payments.reduce(
      (acc, p) => {
        acc.totalRequested += p.amount;
        if (p.status === 'draft') {
          acc.draftCount++;
        }
        if (p.status === 'pending' || p.status === 'paying') {
          acc.pendingCount++;
        }
        if (p.status === 'paid') {
          acc.totalPaid += p.amount;
          acc.paidCount++;
        }
        if (p.status === 'confirmed') {
          acc.totalConfirmed += p.amount;
          acc.confirmedCount++;
        }
        return acc;
      },
      {
        totalRequested: 0,
        totalPaid: 0,
        totalConfirmed: 0,
        draftCount: 0,
        pendingCount: 0,
        paidCount: 0,
        confirmedCount: 0,
      },
    );

    return stats;
  }

  async deletePaymentRequest(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: payment } = await supabase
      .from('payment_requests')
      .select('created_by, status')
      .eq('id', id)
      .maybeSingle();

    if (!payment) {
      throw new NotFoundException('Payment request not found');
    }

    if (payment.created_by !== userId) {
      throw new ForbiddenException('You can only delete your own payment requests');
    }

    if (!['draft', 'cancelled'].includes(payment.status)) {
      throw new BadRequestException('Can only delete draft or cancelled payment requests');
    }

    const { error } = await supabase
      .from('payment_requests')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete payment request: ${error.message}`, error);
      throw new ConflictException('Failed to delete payment request');
    }

    return { message: 'Payment request deleted successfully' };
  }

  private transformPayment(payment: any) {
    return {
      id: payment.id,
      offerId: payment.offer_id,
      createdBy: payment.created_by,
      amount: payment.amount,
      currency: payment.currency,
      paymentType: payment.payment_type,
      paymentMethod: payment.payment_method,
      paymentDetails: payment.payment_details || {},
      instructions: payment.instructions,
      status: payment.status,
      isFrozen: payment.is_frozen,
      confirmedBy: payment.confirmed_by,
      confirmedAt: payment.confirmed_at,
      paymentProof: payment.payment_proof,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    };
  }
}
