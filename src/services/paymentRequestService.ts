import { supabase } from '../core/supabase';
import { PaymentRequest, PaymentStatus, PaymentType } from '../core/types';
import { analytics } from '../core/analytics';
import { chatService } from '../modules/chat/services/chatService';

export class PaymentRequestService {
  async createPaymentRequest(requestData: Partial<PaymentRequest>): Promise<PaymentRequest> {
    try {
      this.validatePaymentRequestData(requestData);

      const newRequest = {
        payer_id: requestData.payerId,
        payee_id: requestData.payeeId,
        offer_id: requestData.relatedOfferId || null,
        application_id: requestData.relatedApplicationId || null,
        amount: requestData.amount,
        currency: requestData.currency || 'USD',
        payment_type: requestData.paymentType || 'full_prepay',
        payment_stage: requestData.paymentStage || 'prepay',
        payment_details: requestData.paymentDetails,
        status: 'pending',
        is_editable: true,
        status_history: [{
          status: 'pending',
          changedBy: requestData.payeeId!, // Инфлюенсер создает запрос
          timestamp: new Date().toISOString(),
          note: 'Окно оплаты создано'
        }],
        metadata: {
          createdBy: requestData.payeeId!,
          ...requestData.metadata
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payment_windows')
        .insert([newRequest])
        .select()
        .single();

      if (error) throw error;

      const createdRequest = this.transformFromDatabase(data);

      // Send payment request as chat message
      await this.sendPaymentRequestToChat(createdRequest);

      // Track analytics
      analytics.track('payment_request_created', {
        payment_request_id: createdRequest.id,
        payer_id: requestData.payerId,
        payee_id: requestData.payeeId,
        amount: requestData.amount,
        payment_type: requestData.paymentType
      });

      return createdRequest;
    } catch (error) {
      console.error('Failed to create payment request:', error);
      throw error;
    }
  }

  async updatePaymentStatus(
    requestId: string,
    newStatus: PaymentStatus,
    changedBy: string,
    note?: string
  ): Promise<PaymentRequest> {
    try {
      // Get current request
      const currentRequest = await this.getPaymentRequest(requestId);
      if (!currentRequest) throw new Error('Payment request not found');

      // Validate status transition
      this.validateStatusTransition(currentRequest, newStatus, changedBy);

      // Update editability based on status
      let isEditable = currentRequest.isEditable;
      if (newStatus === 'paying' || newStatus === 'paid') {
        isEditable = false; // Freeze when payment is in progress
      } else if (newStatus === 'failed') {
        isEditable = true; // Unfreeze on failure
      } else if (['confirmed', 'completed', 'cancelled'].includes(newStatus)) {
        isEditable = false; // Final states
      }

      // Add to status history
      const statusHistory = [
        ...currentRequest.statusHistory,
        {
          status: newStatus,
          changedBy: changedBy,
          timestamp: new Date().toISOString(),
          note: note
        }
      ];

      const { data, error } = await supabase
        .from('payment_windows')
        .update({
          status: newStatus,
          is_editable: isEditable,
          status_history: statusHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      const updatedRequest = this.transformFromDatabase(data);

      // Send status update to chat
      await this.sendStatusUpdateToChat(updatedRequest, newStatus, changedBy, note);

      // Track analytics
      analytics.track('payment_status_updated', {
        payment_request_id: requestId,
        new_status: newStatus,
        changed_by: changedBy
      });

      return updatedRequest;
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  async editPaymentRequest(
    requestId: string,
    updates: Partial<PaymentRequest>,
    editedBy: string
  ): Promise<PaymentRequest> {
    try {
      const currentRequest = await this.getPaymentRequest(requestId);
      if (!currentRequest) throw new Error('Payment request not found');

      // Check edit permissions
      if (!this.canEdit(currentRequest, editedBy)) {
        throw new Error('Нет прав для редактирования этого запроса');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.amount) updateData.amount = updates.amount;
      if (updates.currency) updateData.currency = updates.currency;
      if (updates.paymentType) updateData.payment_type = updates.paymentType;
      if (updates.paymentDetails) updateData.payment_details = updates.paymentDetails;

      const { data, error } = await supabase
        .from('payment_windows')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      const updatedRequest = this.transformFromDatabase(data);

      // Notify about edit in chat
      await chatService.sendMessage({
        senderId: editedBy,
        receiverId: currentRequest.payerId,
        messageContent: '✏️ Окно оплаты было отредактировано. Проверьте обновленные реквизиты.',
        messageType: 'text',
        metadata: {
          paymentRequestId: requestId,
          actionType: 'payment_request_edited'
        }
      });

      return updatedRequest;
    } catch (error) {
      console.error('Failed to edit payment request:', error);
      throw error;
    }
  }

  async getPaymentRequest(requestId: string): Promise<PaymentRequest | null> {
    try {
      const { data, error } = await supabase
        .from('payment_windows')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      if (error?.code === '42P01') {
        console.log('Payment windows table not yet created');
        return null;
      }
      console.error('Failed to get payment request:', error);
      throw error;
    }
  }

  async getUserPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    try {
      const { data, error } = await supabase
        .from('payment_windows')
        .select('*')
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(request => this.transformFromDatabase(request));
    } catch (error) {
      if (error?.code === '42P01') {
        console.log('Payment windows table not yet created');
        return [];
      }
      console.error('Failed to get user payment requests:', error);
      throw error;
    }
  }

  async getPendingPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    try {
      const { data, error } = await supabase
        .from('payment_windows')
        .select('*')
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .in('status', ['pending', 'paying', 'paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(request => this.transformFromDatabase(request));
    } catch (error) {
      if (error?.code === '42P01') {
        console.log('Payment windows table not yet created');
        return [];
      }
      console.error('Failed to get pending payment requests:', error);
      return [];
    }
  }

  private async sendPaymentRequestToChat(request: PaymentRequest): Promise<void> {
    try {
      const statusEmoji = this.getStatusEmoji(request.status);
      const typeLabel = this.getPaymentTypeLabel(request.paymentType);
      
      await chatService.sendMessage({
        senderId: request.payeeId,
        receiverId: request.payerId,
        messageContent: `${statusEmoji} Окно оплаты выставлено на сумму ${this.formatCurrency(request.amount, request.currency)}`,
        messageType: 'payment_window',
        metadata: {
          paymentRequestId: request.id,
          payerId: request.payerId,
          payeeId: request.payeeId,
          paymentType: request.paymentType,
          amount: request.amount,
          currency: request.currency,
          paymentDetails: request.paymentDetails,
          status: request.status,
          isInteractive: true,
          buttons: [
            {
              id: 'paying',
              label: 'Оплачиваю',
              action: 'update_payment_status',
              status: 'paying',
              style: 'warning'
            },
            {
              id: 'paid',
              label: 'Оплатил',
              action: 'update_payment_status', 
              status: 'paid',
              style: 'success'
            }
          ]
        }
      });
    } catch (error) {
      console.error('Failed to send payment request to chat:', error);
      throw error;
    }
  }

  private async sendStatusUpdateToChat(
    request: PaymentRequest,
    newStatus: PaymentStatus,
    changedBy: string,
    note?: string
  ): Promise<void> {
    try {
      const statusEmoji = this.getStatusEmoji(newStatus);
      const statusLabel = this.getStatusLabel(newStatus);
      
      let message = `${statusEmoji} Статус оплаты изменен на "${statusLabel}"`;
      if (note) message += `: ${note}`;

      const receiverId = changedBy === request.payerId ? request.payeeId : request.payerId;
      
      // Update buttons based on new status
      let buttons: any[] = [];
      
      if (newStatus === 'paying') {
        buttons = [
          {
            id: 'paid',
            label: 'Оплатил',
            action: 'update_payment_status',
            status: 'paid',
            style: 'success'
          },
          {
            id: 'failed',
            label: 'Не получилось оплатить',
            action: 'update_payment_status',
            status: 'failed',
            style: 'danger'
          }
        ];
      } else if (newStatus === 'paid') {
        buttons = [
          {
            id: 'confirmed',
            label: 'Получено',
            action: 'update_payment_status',
            status: 'confirmed',
            style: 'success'
          },
          {
            id: 'failed',
            label: 'Не получено',
            action: 'update_payment_status',
            status: 'failed',
            style: 'danger'
          }
        ];
      }

      await chatService.sendMessage({
        senderId: changedBy,
        receiverId: receiverId,
        messageContent: message,
        messageType: 'payment_confirmation',
        metadata: {
          paymentRequestId: request.id,
          payerId: request.payerId,
          payeeId: request.payeeId,
          status: newStatus,
          actionType: 'status_update',
          isInteractive: buttons.length > 0,
          buttons: buttons
        }
      });
    } catch (error) {
      console.error('Failed to send status update to chat:', error);
    }
  }

  private canEdit(request: PaymentRequest, userId: string): boolean {
    // Only payee (influencer) can edit
    if (userId !== request.payeeId) return false;
    
    // Can only edit if editable flag is true
    if (!request.isEditable) return false;
    
    // Can only edit in pending and failed states
    return ['pending', 'failed'].includes(request.status);
  }

  private validateStatusTransition(
    request: PaymentRequest,
    newStatus: PaymentStatus,
    changedBy: string
  ): void {
    const errors: string[] = [];

    // Define allowed transitions by role
    const payeeAllowedStatuses = ['cancelled', 'confirmed'];
    const payerAllowedStatuses = ['paying', 'paid', 'failed'];

    if (changedBy === request.payeeId && !payeeAllowedStatuses.includes(newStatus)) {
      errors.push(`Инфлюенсер не может установить статус "${newStatus}"`);
    }

    if (changedBy === request.payerId && !payerAllowedStatuses.includes(newStatus)) {
      errors.push(`Рекламодатель не может установить статус "${newStatus}"`);
    }

    // Validate logical transitions
    if (request.status === 'cancelled' || request.status === 'completed') {
      errors.push('Нельзя изменить статус завершенного или отмененного запроса');
    }

    if (newStatus === 'confirmed' && request.status !== 'paid') {
      errors.push('Можно подтвердить получение только после статуса "оплачено"');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private validatePaymentRequestData(requestData: Partial<PaymentRequest>): void {
    const errors: string[] = [];

    if (!requestData.payerId) errors.push('Payer ID is required');
    if (!requestData.payeeId) errors.push('Payee ID is required');
    if (requestData.payerId === requestData.payeeId) errors.push('Payer and payee cannot be the same');
    if (!requestData.amount || requestData.amount <= 0) errors.push('Valid amount is required');
    if (!requestData.paymentDetails?.instructions?.trim()) errors.push('Payment instructions are required');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private getStatusEmoji(status: PaymentStatus): string {
    switch (status) {
      case 'pending': return '💳';
      case 'paying': return '⏳';
      case 'paid': return '✅';
      case 'failed': return '❌';
      case 'confirmed': return '💚';
      case 'completed': return '🎉';
      case 'cancelled': return '🚫';
      default: return '💳';
    }
  }

  private getStatusLabel(status: PaymentStatus): string {
    switch (status) {
      case 'pending': return 'Ожидает оплаты';
      case 'paying': return 'Оплачиваю';
      case 'paid': return 'Оплачено';
      case 'failed': return 'Не получилось оплатить';
      case 'confirmed': return 'Получено';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  }

  private getPaymentTypeLabel(type: PaymentType): string {
    switch (type) {
      case 'full_prepay': return 'Полная предоплата';
      case 'partial_prepay_postpay': return 'Частичная предоплата';
      case 'postpay': return 'Постоплата';
      default: return type;
    }
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private transformFromDatabase(dbData: any): PaymentRequest {
    return {
      id: dbData.id,
      payerId: dbData.payer_id,
      payeeId: dbData.payee_id,
      relatedOfferId: dbData.offer_id,
      relatedApplicationId: dbData.application_id,
      amount: Number(dbData.amount),
      currency: dbData.currency,
      paymentType: dbData.payment_type,
      paymentStage: dbData.payment_stage,
      paymentDetails: dbData.payment_details || { instructions: '' },
      status: dbData.status,
      isEditable: dbData.is_editable,
      statusHistory: dbData.status_history || [],
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const paymentRequestService = new PaymentRequestService();