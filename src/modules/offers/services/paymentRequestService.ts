import { supabase } from '../../../core/supabase';
import { PaymentRequest, PaymentRequestStatus } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class PaymentRequestService {
  private transformPaymentRequest(data: any): PaymentRequest {
    return {
      id: data.id,
      offerId: data.offer_id,
      requesterId: data.requester_id,
      amount: data.amount,
      currency: data.currency,
      paymentType: data.payment_type,
      paymentMethod: data.payment_method,
      paymentDetails: data.payment_details,
      instructions: data.instructions,
      status: data.status,
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      paidAt: data.paid_at,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createPaymentRequest(requestData: Partial<PaymentRequest>): Promise<PaymentRequest> {
    try {
      this.validatePaymentRequestData(requestData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payment_requests')
        .insert({
          offer_id: requestData.offerId,
          requester_id: user.id,
          amount: requestData.amount,
          currency: requestData.currency || 'USD',
          payment_type: requestData.paymentType,
          payment_method: requestData.paymentMethod || 'bank_transfer',
          payment_details: requestData.paymentDetails || {},
          instructions: requestData.instructions,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      const request = this.transformPaymentRequest(data);

      analytics.track('payment_request_created', {
        payment_request_id: request.id,
        offer_id: requestData.offerId,
        amount: requestData.amount,
        currency: requestData.currency
      });

      return request;
    } catch (error) {
      console.error('Failed to create payment request:', error);
      throw error;
    }
  }

  async getPaymentRequests(offerId?: string): Promise<PaymentRequest[]> {
    try {
      let query = supabase.from('payment_requests').select('*');

      if (offerId) {
        query = query.eq('offer_id', offerId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => this.transformPaymentRequest(item));
    } catch (error) {
      console.error('Failed to get payment requests:', error);
      throw error;
    }
  }

  async getPaymentRequest(requestId: string): Promise<PaymentRequest> {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      return this.transformPaymentRequest(data);
    } catch (error) {
      console.error('Failed to get payment request:', error);
      throw error;
    }
  }

  async updatePaymentRequest(requestId: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest> {
    try {
      const payload: any = { updated_at: new Date().toISOString() };

      if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
      if (updates.paymentDetails !== undefined) payload.payment_details = updates.paymentDetails;
      if (updates.instructions !== undefined) payload.instructions = updates.instructions;

      const { data, error } = await supabase
        .from('payment_requests')
        .update(payload)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      return this.transformPaymentRequest(data);
    } catch (error) {
      console.error('Failed to update payment request:', error);
      throw error;
    }
  }

  async approvePaymentRequest(requestId: string): Promise<PaymentRequest> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payment_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      return this.transformPaymentRequest(data);
    } catch (error) {
      console.error('Failed to approve payment request:', error);
      throw error;
    }
  }

  async rejectPaymentRequest(requestId: string, reason?: string): Promise<PaymentRequest> {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      return this.transformPaymentRequest(data);
    } catch (error) {
      console.error('Failed to reject payment request:', error);
      throw error;
    }
  }

  async markAsPaid(requestId: string): Promise<PaymentRequest> {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      return this.transformPaymentRequest(data);
    } catch (error) {
      console.error('Failed to mark payment as paid:', error);
      throw error;
    }
  }

  private validatePaymentRequestData(requestData: Partial<PaymentRequest>): void {
    if (!requestData.offerId || !requestData.amount || requestData.amount <= 0) {
      throw new Error('Offer ID and valid amount are required');
    }
    if (!requestData.paymentType) {
      throw new Error('Payment type is required');
    }
  }
}

export const paymentRequestService = new PaymentRequestService();
