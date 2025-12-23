import { supabase } from '../../../core/supabase';
import { showFeatureNotImplemented } from '../../../core/utils';
import { PaymentRequest, PaymentRequestStatus } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class PaymentRequestService {
  async createPaymentRequest(requestData: Partial<PaymentRequest>): Promise<PaymentRequest> {
    try {
      this.validatePaymentRequestData(requestData);

      const payload = {
        offerId: requestData.offerId,
        createdBy: requestData.createdBy,
        amount: requestData.amount,
        currency: requestData.currency || 'RUB',
        paymentType: requestData.paymentType,
        paymentMethod: requestData.paymentMethod || 'bank_transfer',
        paymentDetails: requestData.paymentDetails || {},
        instructions: requestData.instructions,
      };

      const { data, error } = await apiClient.post<any>('/payments', payload);

      if (error) throw new Error(error.message);

      analytics.track('payment_request_created', {
        payment_request_id: data.id,
        offer_id: requestData.offerId,
        amount: requestData.amount,
        payment_type: requestData.paymentType
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to create payment request:', error);
      throw error;
    }
  }

  async updatePaymentStatus(
    requestId: string,
    newStatus: PaymentRequestStatus,
    userId: string,
    additionalData?: any
  ): Promise<PaymentRequest> {
    try {
      let endpoint = '';
      let payload: any = { userId };

      switch (newStatus) {
        case 'pending':
          endpoint = `/payments/${requestId}`;
          payload.status = 'pending';
          break;
        case 'paying':
          endpoint = `/payments/${requestId}/approve`;
          break;
        case 'paid':
          endpoint = `/payments/${requestId}/mark-paid`;
          payload.paymentProof = additionalData?.paymentProof;
          break;
        case 'confirmed':
          endpoint = `/payments/${requestId}/confirm`;
          break;
        case 'failed':
          endpoint = `/payments/${requestId}/reject`;
          break;
        case 'cancelled':
          endpoint = `/payments/${requestId}/cancel`;
          break;
        default:
          endpoint = `/payments/${requestId}`;
          payload.status = newStatus;
      }

      const { data, error } = await apiClient.post<any>(endpoint, payload);

      if (error) throw new Error(error.message);

      analytics.track('payment_request_status_updated', {
        payment_request_id: requestId,
        new_status: newStatus,
        user_id: userId
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  async getPaymentRequest(requestId: string): Promise<PaymentRequest | null> {
    try {
      const { data, error } = await apiClient.get<any>(`/payments/${requestId}`);

      if (error) {
        if (error.status === 404) return null;
        throw new Error(error.message);
      }

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get payment request:', error);
      throw error;
    }
  }

  async getOfferPaymentRequests(offerId: string): Promise<PaymentRequest[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/payments?offerId=${offerId}`);

      if (error) throw new Error(error.message);

      return (data || []).map(request => this.transformFromApi(request));
    } catch (error) {
      console.error('Failed to get offer payment requests:', error);
      throw error;
    }
  }

  async deletePaymentRequest(requestId: string, userId: string): Promise<void> {
    try {
      const { error } = await apiClient.delete(`/payments/${requestId}`);

      if (error) throw new Error(error.message);

      analytics.track('payment_request_deleted', {
        payment_request_id: requestId,
        user_id: userId
      });
    } catch (error) {
      console.error('Failed to delete payment request:', error);
      throw error;
    }
  }

  async getPaymentStatistics(): Promise<any> {
    try {
      const { data, error } = await apiClient.get<any>('/payments/statistics');

      if (error) throw new Error(error.message);

      return data;
    } catch (error) {
      console.error('Failed to get payment statistics:', error);
      throw error;
    }
  }

  async getPaymentRequestsForOffer(offerId: string): Promise<PaymentRequest[]> {
    return this.getOfferPaymentRequests(offerId);
  }

  private validatePaymentRequestData(requestData: Partial<PaymentRequest>): void {
    const errors: string[] = [];

    if (!requestData.offerId) errors.push('Offer ID is required');
    if (!requestData.createdBy) errors.push('Creator ID is required');
    if (!requestData.amount || requestData.amount <= 0) errors.push('Valid amount is required');
    if (!requestData.paymentType) errors.push('Payment type is required');
    if (!requestData.paymentDetails) errors.push('Payment details are required');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromApi(apiData: any): PaymentRequest {
    return {
      id: apiData.id,
      offerId: apiData.offerId || apiData.offer_id,
      createdBy: apiData.createdBy || apiData.created_by,
      amount: parseFloat(apiData.amount),
      currency: apiData.currency,
      paymentType: apiData.paymentType || apiData.payment_type,
      paymentMethod: apiData.paymentMethod || apiData.payment_method,
      paymentDetails: apiData.paymentDetails || apiData.payment_details || {},
      instructions: apiData.instructions,
      status: apiData.status,
      isFrozen: apiData.isFrozen ?? apiData.is_frozen,
      confirmedBy: apiData.confirmedBy || apiData.confirmed_by,
      confirmedAt: apiData.confirmedAt || apiData.confirmed_at,
      paymentProof: apiData.paymentProof || apiData.payment_proof || {},
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }
}

export const paymentRequestService = new PaymentRequestService();
