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
      .select('advertiser_id, influencer_id, status, proposed_rate')
      .eq('offer_id', createDto.offerId)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'completed') {
      throw new BadRequestException('Can only request payment for completed offers');
    }

    if (offer.influencer_id !== userId) {
      throw new ForbiddenException('Only the influencer can request payment');
    }

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
      influencer_id: userId,
      advertiser_id: offer.advertiser_id,
      amount: createDto.amount || offer.proposed_rate,
      currency: createDto.currency,
      description: createDto.description,
      payment_method: createDto.paymentMethod,
      status: 'pending',
      requested_at: new Date().toISOString(),
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

  async findAll(userId: string, filters?: { status?: string; asAdvertiser?: boolean }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('payment_requests')
      .select(`
        *,
        offer:offers(*),
        influencer:user_profiles!payment_requests_influencer_id_fkey(*),
        advertiser:user_profiles!payment_requests_advertiser_id_fkey(*)
      `);

    if (filters?.asAdvertiser) {
      query = query.eq('advertiser_id', userId);
    } else {
      query = query.eq('influencer_id', userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: payments, error } = await query.order('requested_at', { ascending: false });

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
      .select(`
        *,
        offer:offers(*),
        influencer:user_profiles!payment_requests_influencer_id_fkey(*),
        advertiser:user_profiles!payment_requests_advertiser_id_fkey(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !payment) {
      throw new NotFoundException('Payment request not found');
    }

    if (payment.influencer_id !== userId && payment.advertiser_id !== userId) {
      throw new ForbiddenException('You can only view your own payment requests');
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
      .select('advertiser_id, influencer_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!payment) {
      throw new NotFoundException('Payment request not found');
    }

    const hasPermission =
      requiredRole === 'advertiser' ? payment.advertiser_id === userId : payment.influencer_id === userId;

    if (!hasPermission) {
      throw new ForbiddenException(`Only ${requiredRole} can perform this action`);
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['approved', 'rejected', 'cancelled'],
      approved: ['paid', 'cancelled'],
      rejected: [],
      paid: [],
      cancelled: [],
    };

    if (!validTransitions[payment.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${payment.status} to ${status}`);
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = userId;
    }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    if (updateDto.adminNotes) {
      updateData.admin_notes = updateDto.adminNotes;
    }

    if (updateDto.transactionId) {
      updateData.transaction_id = updateDto.transactionId;
    }

    if (updateDto.proofOfPayment) {
      updateData.proof_of_payment = updateDto.proofOfPayment;
    }

    const { data: updated, error } = await supabase
      .from('payment_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        offer:offers(*),
        influencer:user_profiles!payment_requests_influencer_id_fkey(*),
        advertiser:user_profiles!payment_requests_advertiser_id_fkey(*)
      `)
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
      .eq('influencer_id', userId);

    if (!payments || payments.length === 0) {
      return {
        totalRequested: 0,
        totalApproved: 0,
        totalPaid: 0,
        pendingCount: 0,
        approvedCount: 0,
        paidCount: 0,
      };
    }

    const stats = payments.reduce(
      (acc, p) => {
        acc.totalRequested += p.amount;
        if (p.status === 'approved') {
          acc.totalApproved += p.amount;
          acc.approvedCount++;
        }
        if (p.status === 'paid') {
          acc.totalPaid += p.amount;
          acc.paidCount++;
        }
        if (p.status === 'pending') {
          acc.pendingCount++;
        }
        return acc;
      },
      {
        totalRequested: 0,
        totalApproved: 0,
        totalPaid: 0,
        pendingCount: 0,
        approvedCount: 0,
        paidCount: 0,
      },
    );

    return stats;
  }

  private transformPayment(payment: any) {
    return {
      id: payment.id,
      offerId: payment.offer_id,
      influencerId: payment.influencer_id,
      advertiserId: payment.advertiser_id,
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      paymentMethod: payment.payment_method,
      status: payment.status,
      requestedAt: payment.requested_at,
      approvedAt: payment.approved_at,
      paidAt: payment.paid_at,
      approvedBy: payment.approved_by,
      adminNotes: payment.admin_notes,
      transactionId: payment.transaction_id,
      proofOfPayment: payment.proof_of_payment,
      updatedAt: payment.updated_at,
      offer: payment.offer,
      influencer: payment.influencer
        ? {
            id: payment.influencer.user_id,
            fullName: payment.influencer.full_name,
            username: payment.influencer.username,
            avatar: payment.influencer.avatar,
          }
        : undefined,
      advertiser: payment.advertiser
        ? {
            id: payment.advertiser.user_id,
            fullName: payment.advertiser.full_name,
            username: payment.advertiser.username,
            avatar: payment.advertiser.avatar,
          }
        : undefined,
    };
  }
}
