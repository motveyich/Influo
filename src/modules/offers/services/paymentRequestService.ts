import { supabase, TABLES } from '../../../core/supabase';
import { PaymentRequest, PaymentRequestStatus } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { chatService } from '../../chat/services/chatService';

export class PaymentRequestService {
  async createPaymentRequest(requestData: Partial<PaymentRequest>): Promise<PaymentRequest> {
    try {
      this.validatePaymentRequestData(requestData);

      const newRequest = {
        offer_id: requestData.offerId,
        created_by: requestData.createdBy,
        amount: requestData.amount,
        currency: requestData.currency || 'USD',
        payment_type: requestData.paymentType,
        payment_method: requestData.paymentMethod || 'bank_transfer',
        payment_details: requestData.paymentDetails || {},
        instructions: requestData.instructions,
        status: 'draft',
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.PAYMENT_REQUESTS)
        .insert([newRequest])
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to create payment request');

      const transformedRequest = this.transformFromDatabase(data);

      // Send notification
      await this.sendPaymentRequestNotification(transformedRequest);

      // Track analytics
      analytics.track('payment_request_created', {
        payment_request_id: transformedRequest.id,
        offer_id: requestData.offerId,
        amount: requestData.amount,
        payment_type: requestData.paymentType
      });

      return transformedRequest;
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
      const currentRequest = await this.getPaymentRequest(requestId);
      if (!currentRequest) {
        throw new Error('Payment request not found');
      }

      // Validate permission
      this.validatePaymentStatusChangePermission(currentRequest, newStatus, userId);

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Handle specific status changes
      if (newStatus === 'paying') {
        updateData.is_frozen = true; // Freeze payment window
      }

      if (newStatus === 'paid') {
        updateData.confirmed_by = userId;
        updateData.confirmed_at = new Date().toISOString();
        updateData.payment_proof = additionalData?.paymentProof || {};
      }

      if (newStatus === 'failed') {
        updateData.is_frozen = false; // Unfreeze for editing
      }

      const { data, error } = await supabase
        .from(TABLES.PAYMENT_REQUESTS)
        .update(updateData)
        .eq('id', requestId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Payment request not found');

      const updatedRequest = this.transformFromDatabase(data);

      // Send status update notification
      await this.sendPaymentStatusNotification(updatedRequest, newStatus);

      // Track analytics
      analytics.track('payment_request_status_updated', {
        payment_request_id: requestId,
        new_status: newStatus,
        user_id: userId
      });

      return updatedRequest;
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  async getPaymentRequest(requestId: string): Promise<PaymentRequest | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_REQUESTS)
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get payment request:', error);
      throw error;
    }
  }

  async getOfferPaymentRequests(offerId: string): Promise<PaymentRequest[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_REQUESTS)
        .select('*')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(request => this.transformFromDatabase(request));
    } catch (error) {
      console.error('Failed to get offer payment requests:', error);
      throw error;
    }
  }

  async deletePaymentRequest(requestId: string, userId: string): Promise<void> {
    try {
      const currentRequest = await this.getPaymentRequest(requestId);
      if (!currentRequest) {
        throw new Error('Payment request not found');
      }

      // Only creator can delete unfrozen requests
      if (currentRequest.createdBy !== userId) {
        throw new Error('Only creator can delete payment requests');
      }

      if (currentRequest.isFrozen) {
        throw new Error('Cannot delete frozen payment request');
      }

      const { error } = await supabase
        .from(TABLES.PAYMENT_REQUESTS)
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      // Track analytics
      analytics.track('payment_request_deleted', {
        payment_request_id: requestId,
        user_id: userId
      });
    } catch (error) {
      console.error('Failed to delete payment request:', error);
      throw error;
    }
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

  private validatePaymentStatusChangePermission(
    request: PaymentRequest, 
    newStatus: PaymentRequestStatus, 
    userId: string
  ): void {
    // Only creator (influencer) can edit unfrozen requests
    if (['draft', 'pending'].includes(newStatus) && request.createdBy !== userId) {
      throw new Error('Only creator can edit payment requests');
    }

    // Advertiser actions for payment confirmation
    if (['paying', 'paid', 'failed'].includes(newStatus)) {
      // Get offer to check if user is advertiser
      // This would need to be validated via the offer relationship
    }

    // Cannot modify frozen requests (except by advertiser for payment actions)
    if (request.isFrozen && !['paying', 'paid', 'failed', 'confirmed'].includes(newStatus)) {
      throw new Error('Cannot modify frozen payment request');
    }
  }

  private async sendPaymentRequestNotification(request: PaymentRequest): Promise<void> {
    try {
      // Get offer details to determine participants
      const { data: offer } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .select('influencer_id, advertiser_id, title')
        .eq('id', request.offerId)
        .maybeSingle();

      if (!offer) return;

      const receiverId = offer.advertiser_id; // Always send to advertiser

      await chatService.sendMessage({
        senderId: request.createdBy,
        receiverId: receiverId,
        messageContent: `💳 Создано окно оплаты на сумму ${request.amount} ${request.currency} для сотрудничества "${offer.title}"`,
        messageType: 'payment_window',
        metadata: {
          paymentRequestId: request.id,
          offerId: request.offerId,
          amount: request.amount,
          paymentType: request.paymentType,
          paymentDetails: request.paymentDetails,
          status: request.status
        }
      });
    } catch (error) {
      console.error('Failed to send payment request notification:', error);
    }
  }

  private async sendPaymentStatusNotification(request: PaymentRequest, newStatus: PaymentRequestStatus): Promise<void> {
    try {
      // Get offer details
      const { data: offer } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .select('influencer_id, advertiser_id, title')
        .eq('id', request.offerId)
        .maybeSingle();

      if (!offer) return;

      const isAdvertiserAction = request.createdBy !== offer.advertiser_id;
      const senderId = isAdvertiserAction ? offer.advertiser_id : offer.influencer_id;
      const receiverId = isAdvertiserAction ? offer.influencer_id : offer.advertiser_id;

      let messageContent = '';
      switch (newStatus) {
        case 'pending':
          messageContent = `💳 Инфлюенсер создал окно оплаты на сумму ${request.amount} ${request.currency} для "${offer.title}". Ожидает вашей оплаты.`;
          break;
        case 'paying':
          messageContent = `💰 Рекламодатель начал процесс оплаты для "${offer.title}"`;
          break;
        case 'paid':
          messageContent = `✅ Оплата ${request.amount} ${request.currency} произведена для "${offer.title}"`;
          break;
        case 'confirmed':
          messageContent = `🎉 Оплата ${request.amount} ${request.currency} подтверждена для "${offer.title}"`;
          break;
        case 'failed':
          messageContent = `❌ Оплата для "${offer.title}" не удалась. Окно оплаты разморожено для редактирования`;
          break;
        default:
          return;
      }

      await chatService.sendMessage({
        senderId,
        receiverId,
        messageContent,
        messageType: 'payment_confirmation',
        metadata: {
          paymentRequestId: request.id,
          offerId: request.offerId,
          actionType: `payment_${newStatus}`,
          amount: request.amount
        }
      });
    } catch (error) {
      console.error('Failed to send payment status notification:', error);
    }
  }

  private transformFromDatabase(dbData: any): PaymentRequest {
    return {
      id: dbData.id,
      offerId: dbData.offer_id,
      createdBy: dbData.created_by,
      amount: parseFloat(dbData.amount),
      currency: dbData.currency,
      paymentType: dbData.payment_type,
      paymentMethod: dbData.payment_method,
      paymentDetails: dbData.payment_details || {},
      instructions: dbData.instructions,
      status: dbData.status,
      isFrozen: dbData.is_frozen,
      confirmedBy: dbData.confirmed_by,
      confirmedAt: dbData.confirmed_at,
      paymentProof: dbData.payment_proof || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  async getPaymentRequestsForOffer(offerId: string): Promise<PaymentRequest[]> {
    return this.getOfferPaymentRequests(offerId);
  }
}

export const paymentRequestService = new PaymentRequestService();