import { api } from '../core/api';
import { supabase } from '../core/supabase';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: 'general' | 'technical' | 'billing' | 'account' | 'feature' | 'bug';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  resolved_at: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
  attachments: string[];
}

export interface CreateTicketData {
  subject: string;
  category: string;
  priority: string;
  message: string;
}

export interface TicketWithMessages extends SupportTicket {
  messages: SupportMessage[];
  message_count: number;
}

export const supportService = {
  async createTicket(userId: string, data: CreateTicketData): Promise<SupportTicket> {
    const ticket = await api.post('/support/tickets', data);
    return ticket;
  },

  async getUserTickets(userId: string): Promise<TicketWithMessages[]> {
    const data = await api.get('/support/tickets');
    return data;
  },

  async getAllTickets(): Promise<TicketWithMessages[]> {
    const data = await api.get('/support/tickets');
    return data;
  },

  async getTicketById(ticketId: string): Promise<TicketWithMessages | null> {
    try {
      const ticket = await api.get(`/support/tickets/${ticketId}`);
      const messages = await api.get(`/support/tickets/${ticketId}/messages`);
      return {
        ...ticket,
        messages: messages || [],
        message_count: messages?.length || 0
      };
    } catch (error) {
      console.error('Failed to get ticket:', error);
      return null;
    }
  },

  async addMessage(ticketId: string, senderId: string, message: string, isStaffResponse: boolean = false): Promise<SupportMessage> {
    const data = await api.post(`/support/tickets/${ticketId}/messages`, {
      message,
      is_staff_response: isStaffResponse
    });
    return data;
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status'], resolvedAt?: string): Promise<void> {
    const updateData: any = { status };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = resolvedAt || new Date().toISOString();
    }
    await api.patch(`/support/tickets/${ticketId}`, updateData);
  },

  async assignTicket(ticketId: string, assignedTo: string | null): Promise<void> {
    await api.patch(`/support/tickets/${ticketId}`, {
      assigned_to: assignedTo,
      status: assignedTo ? 'in_progress' : 'open'
    });
  },

  async closeTicket(ticketId: string): Promise<void> {
    await this.updateTicketStatus(ticketId, 'closed');
  },

  async getTicketsByStatus(status: SupportTicket['status']): Promise<TicketWithMessages[]> {
    const data = await api.get('/support/tickets', { params: { status } });
    return data;
  },

  async getAssignedTickets(userId: string): Promise<TicketWithMessages[]> {
    const data = await api.get('/support/tickets');
    return data;
  },

  subscribeToTicket(ticketId: string, callback: (message: SupportMessage) => void) {
    return supabase
      .channel(`ticket:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          callback(payload.new as SupportMessage);
        }
      )
      .subscribe();
  }
};
