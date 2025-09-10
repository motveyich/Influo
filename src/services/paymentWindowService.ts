import { supabase } from '../core/supabase';
import { PaymentWindow, PaymentWindowStatus, PaymentWindowType } from '../core/types';
import { analytics } from '../core/analytics';
import { chatService } from '../modules/chat/services/chatService';

export class PaymentWindowService {
  async createPaymentWindow(windowData: Partial<PaymentWindow>): Promise<PaymentWindow> {
    try {
      this.validatePaymentWindowData(windowData);

      const newWindow = {
        deal_id: windowData.dealId || null,
        offer_id: windowData.offerId || null,
        application_id: windowData.applicationId || null,
        payer_id: windowData.payerId,
        payee_id: windowData.payeeId,
        amount: windowData.amount,
        currency: windowData.currency || 'USD',
        payment_type: windowData.paymentType || 'full_prepay',
        payment_details: windowData.paymentDetails || { instructions: '' },
        status: 'pending',
        payment_stage: windowData.paymentStage || 'prepay',
        is_editable: true,
        status_history: [{
          status: 'pending',
          changedBy: windowData.payeeId!, // Инфлюенсер создает окно
          timestamp: new Date().toISOString(),
          note: 'Окно оплаты создано'
        }],
        metadata: {
          createdBy: windowData.payeeId!,
          paymentAttempts: 0,
          ...windowData.metadata
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payment_windows')
        .insert([newWindow])
        .select()
        .single();

      if (error) throw error;

      const createdWindow = this.transformFromDatabase(data);

      // Send payment window as chat message
      await this.sendPaymentWindowToChat(createdWindow);

      // Track analytics
      analytics.track('payment_window_created', {
        payment_window_id: createdWindow.id,
        payer_id: windowData.payerId,
        payee_id: windowData.payeeId,
        amount: windowData.amount,
        payment_type: windowData.paymentType
      });

      return createdWindow;
    } catch (error) {
      console.error('Failed to create payment window:', error);
      throw error;
    }
  }

  async updatePaymentWindowStatus(
    windowId: string,
    newStatus: PaymentWindowStatus,
    changedBy: string,
    note?: string
  ): Promise<PaymentWindow> {
    try {
      // Get current window
      const currentWindow = await this.getPaymentWindow(windowId);
      if (!currentWindow) throw new Error('Payment window not found');

      // Check permissions
      if (!this.canUserChangeStatus(currentWindow, changedBy, newStatus)) {
        throw new Error('Нет прав для изменения этого статуса');
      }

      // Update editability based on status
      let isEditable = currentWindow.isEditable;
      if (newStatus === 'paying' || newStatus === 'paid') {
        isEditable = false; // Заморозить для редактирования
      } else if (newStatus === 'failed') {
        isEditable = true; // Разморозить при неудаче
      } else if (newStatus === 'completed' || newStatus === 'cancelled') {
        isEditable = false; // Финальные статусы
      }

      // Add to status history
      const statusHistory = [
        ...currentWindow.statusHistory,
        {
          status: newStatus,
          changedBy: changedBy,
          timestamp: new Date().toISOString(),
          note: note
        }
      ];

      // Update metadata
      const metadata = { ...currentWindow.metadata };
      if (newStatus === 'paying' || newStatus === 'paid' || newStatus === 'failed') {
        metadata.paymentAttempts = (metadata.paymentAttempts || 0) + 1;
      }

      const { data, error } = await supabase
        .from('payment_windows')
        .update({
          status: newStatus,
          is_editable: isEditable,
          status_history: statusHistory,
          metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', windowId)
        .select()
        .single();

      if (error) throw error;

      const updatedWindow = this.transformFromDatabase(data);

      // Send status update to chat
      await this.sendStatusUpdateToChat(updatedWindow, newStatus, changedBy, note);

      // Track analytics
      analytics.track('payment_window_status_changed', {
        payment_window_id: windowId,
        new_status: newStatus,
        changed_by: changedBy,
        is_editable: isEditable
      });

      return updatedWindow;
    } catch (error) {
      console.error('Failed to update payment window status:', error);
      throw error;
    }
  }

  async updatePaymentWindow(
    windowId: string,
    updates: Partial<PaymentWindow>,
    updatedBy: string
  ): Promise<PaymentWindow> {
    try {
      // Get current window
      const currentWindow = await this.getPaymentWindow(windowId);
      if (!currentWindow) throw new Error('Payment window not found');

      // Check if user can edit
      if (!this.canUserEdit(currentWindow, updatedBy)) {
        throw new Error('Нет прав для редактирования этого окна оплаты');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.amount) updateData.amount = updates.amount;
      if (updates.currency) updateData.currency = updates.currency;
      if (updates.paymentType) updateData.payment_type = updates.paymentType;
      if (updates.paymentDetails) updateData.payment_details = updates.paymentDetails;

      // Update metadata
      const metadata = {
        ...currentWindow.metadata,
        lastEditedAt: new Date().toISOString()
      };
      updateData.metadata = metadata;

      const { data, error } = await supabase
        .from('payment_windows')
        .update(updateData)
        .eq('id', windowId)
        .select()
        .single();

      if (error) throw error;

      const updatedWindow = this.transformFromDatabase(data);

      // Notify about edit in chat
      await chatService.sendMessage({
        senderId: updatedBy,
        receiverId: currentWindow.payerId,
        messageContent: '✏️ Окно оплаты было отредактировано. Проверьте обновленные реквизиты.',
        messageType: 'text',
        metadata: {
          paymentWindowId: windowId,
          actionType: 'payment_window_edited'
        }
      });

      return updatedWindow;
    } catch (error) {
      console.error('Failed to update payment window:', error);
      throw error;
    }
  }

  async getPaymentWindow(windowId: string): Promise<PaymentWindow | null> {
    try {
      const { data, error } = await supabase
        .from('payment_windows')
        .select('*')
        .eq('id', windowId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      if (error?.code === '42P01') {
        console.log('Payment windows table not yet created');
        return null;
      }
      console.error('Failed to get payment window:', error);
      throw error;
    }
  }

  async getUserPaymentWindows(userId: string): Promise<PaymentWindow[]> {
    try {
      const { data, error } = await supabase
        .from('payment_windows')
        .select('*')
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(window => this.transformFromDatabase(window));
    } catch (error) {
      if (error?.code === '42P01') {
        console.log('Payment windows table not yet created');
        return [];
      }
      console.error('Failed to get user payment windows:', error);
      return [];
    }
  }

  async getPendingPaymentWindows(userId: string): Promise<PaymentWindow[]> {
    try {
      const { data, error } = await supabase
        .from('payment_windows')
        .select('*')
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .in('status', ['pending', 'paying', 'paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(window => this.transformFromDatabase(window));
    } catch (error) {
      if (error?.code === '42P01') {
        console.log('Payment windows table not yet created');
        return [];
      }
      console.error('Failed to get pending payment windows:', error);
      return [];
    }
  }

  private async sendPaymentWindowToChat(window: PaymentWindow): Promise<void> {
    try {
      const statusEmoji = this.getStatusEmoji(window.status);
      const typeLabel = this.getPaymentTypeLabel(window.paymentType);
      
      await chatService.sendMessage({
        senderId: window.payeeId,
        receiverId: window.payerId,
        messageContent: `${statusEmoji} Окно оплаты выставлено на сумму ${this.formatCurrency(window.amount, window.currency)}`,
        messageType: 'payment_window',
        metadata: {
          paymentWindowId: window.id,
          paymentType: window.paymentType,
          amount: window.amount,
          currency: window.currency,
          paymentDetails: window.paymentDetails,
          status: window.status,
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
      console.error('Failed to send payment window to chat:', error);
      throw error;
    }
  }

  private async sendStatusUpdateToChat(
    window: PaymentWindow,
    newStatus: PaymentWindowStatus,
    changedBy: string,
    note?: string
  ): Promise<void> {
    try {
      const statusEmoji = this.getStatusEmoji(newStatus);
      const statusLabel = this.getStatusLabel(newStatus);
      
      let message = `${statusEmoji} Статус оплаты изменен на "${statusLabel}"`;
      if (note) message += `: ${note}`;

      const receiverId = changedBy === window.payerId ? window.payeeId : window.payerId;
      
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
          }
        ];
      }

      await chatService.sendMessage({
        senderId: changedBy,
        receiverId: receiverId,
        messageContent: message,
        messageType: 'payment_confirmation',
        metadata: {
          paymentWindowId: window.id,
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

  private canUserEdit(window: PaymentWindow, userId: string): boolean {
    // Только инфлюенсер (payee) может редактировать
    if (userId !== window.payeeId) return false;
    
    // Можно редактировать только если is_editable = true
    if (!window.isEditable) return false;
    
    // Можно редактировать только в статусах pending и failed
    return ['pending', 'failed'].includes(window.status);
  }

  private canUserChangeStatus(
    window: PaymentWindow,
    userId: string,
    newStatus: PaymentWindowStatus
  ): boolean {
    // Инфлюенсер может создавать и отменять
    if (userId === window.payeeId) {
      return ['cancelled', 'confirmed'].includes(newStatus);
    }
    
    // Рекламодатель может менять статусы оплаты
    if (userId === window.payerId) {
      return ['paying', 'paid', 'failed'].includes(newStatus);
    }
    
    return false;
  }

  private getStatusEmoji(status: PaymentWindowStatus): string {
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

  private getStatusLabel(status: PaymentWindowStatus): string {
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

  private getPaymentTypeLabel(type: PaymentWindowType): string {
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

  private validatePaymentWindowData(windowData: Partial<PaymentWindow>): void {
    const errors: string[] = [];

    if (!windowData.payerId) errors.push('Payer ID is required');
    if (!windowData.payeeId) errors.push('Payee ID is required');
    if (windowData.payerId === windowData.payeeId) errors.push('Payer and payee cannot be the same');
    if (!windowData.amount || windowData.amount <= 0) errors.push('Valid amount is required');
    if (!windowData.paymentDetails?.instructions?.trim()) errors.push('Payment instructions are required');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): PaymentWindow {
    return {
      id: dbData.id,
      dealId: dbData.deal_id,
      offerId: dbData.offer_id,
      applicationId: dbData.application_id,
      payerId: dbData.payer_id,
      payeeId: dbData.payee_id,
      amount: Number(dbData.amount),
      currency: dbData.currency,
      paymentType: dbData.payment_type,
      paymentDetails: dbData.payment_details || { instructions: '' },
      status: dbData.status,
      paymentStage: dbData.payment_stage,
      isEditable: dbData.is_editable,
      statusHistory: dbData.status_history || [],
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const paymentWindowService = new PaymentWindowService();