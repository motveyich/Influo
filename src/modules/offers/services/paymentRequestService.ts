import { apiClient } from '../../../core/api';
import { PaymentRequest, PaymentRequestStatus } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class PaymentRequestService {
  async createPaymentRequest(requestData: Partial<PaymentRequest>): Promise<PaymentRequest> {
    try {
      this.validatePaymentRequestData(requestData);

      const payload = {
        offerId: requestData.offerId,
        amount: requestData.amount,
        currency: requestData.currency || 'USD',
        paymentType: requestData.paymentType || 'full',
        paymentMethod: requestData.paymentMethod || 'bank_transfer',
        paymentDetails: requestData.paymentDetails || {},
        instructions: requestData.instructions || '',
      };

      const request = await apiClient.post<PaymentRequest>('/payments', payload);

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
      const query = offerId ? `?offerId=${offerId}` : '';
      return await apiClient.get<PaymentRequest[]>(`/payments${query}`);
    } catch (error) {
      console.error('Failed to get payment requests:', error);
      throw error;
    }
  }

  async getPaymentRequest(requestId: string): Promise<PaymentRequest> {
    try {
      return await apiClient.get<PaymentRequest>(`/payments/${requestId}`);
    } catch (error) {
      console.error('Failed to get payment request:', error);
      throw error;
    }
  }

  async updatePaymentRequest(requestId: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest> {
    try {
      return await apiClient.patch<PaymentRequest>(`/payments/${requestId}`, updates);
    } catch (error) {
      console.error('Failed to update payment request:', error);
      throw error;
    }
  }

  async approvePaymentRequest(requestId: string): Promise<PaymentRequest> {
    try {
      return await apiClient.post<PaymentRequest>(`/payments/${requestId}/approve`);
    } catch (error) {
      console.error('Failed to approve payment request:', error);
      throw error;
    }
  }

  async rejectPaymentRequest(requestId: string, reason?: string): Promise<PaymentRequest> {
    try {
      return await apiClient.post<PaymentRequest>(`/payments/${requestId}/reject`, { reason });
    } catch (error) {
      console.error('Failed to reject payment request:', error);
      throw error;
    }
  }

  async markAsPaid(requestId: string): Promise<PaymentRequest> {
    try {
      return await apiClient.post<PaymentRequest>(`/payments/${requestId}/mark-paid`);
    } catch (error) {
      console.error('Failed to mark payment as paid:', error);
      throw error;
    }
  }

  async getOfferPaymentRequests(offerId: string): Promise<PaymentRequest[]> {
    try {
      return await this.getPaymentRequests(offerId);
    } catch (error) {
      console.error('Failed to get offer payment requests:', error);
      throw error;
    }
  }

  async updatePaymentStatus(paymentId: string, newStatus: string, userId: string): Promise<PaymentRequest> {
    try {
      return await apiClient.patch<PaymentRequest>(`/payments/${paymentId}/status`, {
        status: newStatus
      });
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  async deletePaymentRequest(paymentId: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(`/payments/${paymentId}`);
    } catch (error) {
      console.error('Failed to delete payment request:', error);
      throw error;
    }
  }

  private validatePaymentRequestData(requestData: Partial<PaymentRequest>): void {
    if (!requestData.offerId || !requestData.amount || requestData.amount <= 0) {
      throw new Error('Offer ID and valid amount are required');
    }
  }
}

export const paymentRequestService = new PaymentRequestService();
