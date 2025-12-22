import { apiClient, showFeatureNotImplemented } from '../core/api';

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
    const { data: ticket, error } = await apiClient.post<any>('/support/tickets', {
      userId,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      message: data.message
    });

    if (error) throw new Error(error.message);

    return ticket;
  },

  async getUserTickets(userId: string): Promise<TicketWithMessages[]> {
    const { data, error } = await apiClient.get<any[]>(`/support/tickets?userId=${userId}`);

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.messageCount || ticket.message_count || 0,
      messages: []
    }));
  },

  async getAllTickets(): Promise<TicketWithMessages[]> {
    const { data, error } = await apiClient.get<any[]>('/support/tickets');

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.messageCount || ticket.message_count || 0,
      messages: []
    }));
  },

  async getTicketById(ticketId: string): Promise<TicketWithMessages | null> {
    const { data, error } = await apiClient.get<any>(`/support/tickets/${ticketId}`);

    if (error) {
      if (error.status === 404) return null;
      throw new Error(error.message);
    }

    return {
      ...data,
      messages: data.messages || [],
      message_count: data.messages?.length || data.messageCount || 0
    };
  },

  async addMessage(ticketId: string, senderId: string, message: string, isStaffResponse: boolean = false): Promise<SupportMessage> {
    const { data, error } = await apiClient.post<any>(`/support/tickets/${ticketId}/messages`, {
      senderId,
      message,
      isStaffResponse
    });

    if (error) throw new Error(error.message);

    return data;
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status'], resolvedAt?: string): Promise<void> {
    const payload: any = { status };
    if (status === 'resolved' || status === 'closed') {
      payload.resolvedAt = resolvedAt || new Date().toISOString();
    }

    const { error } = await apiClient.patch(`/support/tickets/${ticketId}`, payload);

    if (error) throw new Error(error.message);
  },

  async assignTicket(ticketId: string, assignedTo: string | null): Promise<void> {
    const { error } = await apiClient.patch(`/support/tickets/${ticketId}`, {
      assignedTo,
      status: assignedTo ? 'in_progress' : 'open'
    });

    if (error) throw new Error(error.message);
  },

  async closeTicket(ticketId: string): Promise<void> {
    await this.updateTicketStatus(ticketId, 'closed');
  },

  async getTicketsByStatus(status: SupportTicket['status']): Promise<TicketWithMessages[]> {
    const { data, error } = await apiClient.get<any[]>(`/support/tickets?status=${status}`);

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.messageCount || ticket.message_count || 0,
      messages: []
    }));
  },

  async getAssignedTickets(userId: string): Promise<TicketWithMessages[]> {
    const { data, error } = await apiClient.get<any[]>(`/support/tickets?assignedTo=${userId}`);

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.messageCount || ticket.message_count || 0,
      messages: []
    }));
  },

  async getStatistics(): Promise<any> {
    const { data, error } = await apiClient.get<any>('/support/statistics');

    if (error) throw new Error(error.message);

    return data;
  },

  subscribeToTicket(ticketId: string, callback: (message: SupportMessage) => void) {
    showFeatureNotImplemented('Real-time ticket subscription', 'WebSocket /support/tickets/{id}/subscribe');
    return {
      unsubscribe: () => {}
    };
  }
};
