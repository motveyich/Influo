
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
    throw new Error('Support ticket system not implemented - please contact admin directly');
  },

  async getUserTickets(userId: string): Promise<TicketWithMessages[]> {
    return [];
  },

  async getAllTickets(): Promise<TicketWithMessages[]> {
    return [];
  },

  async getTicketById(ticketId: string): Promise<TicketWithMessages | null> {
    return null;
  },

  async addMessage(ticketId: string, senderId: string, message: string, isStaffResponse: boolean = false): Promise<SupportMessage> {
    throw new Error('Support ticket system not implemented');
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status'], resolvedAt?: string): Promise<void> {
    throw new Error('Support ticket system not implemented');
  },

  async assignTicket(ticketId: string, assignedTo: string | null): Promise<void> {
    throw new Error('Support ticket system not implemented');
  },

  async closeTicket(ticketId: string): Promise<void> {
    throw new Error('Support ticket system not implemented');
  },

  async getTicketsByStatus(status: SupportTicket['status']): Promise<TicketWithMessages[]> {
    return [];
  },

  async getAssignedTickets(userId: string): Promise<TicketWithMessages[]> {
    return [];
  },

  subscribeToTicket(ticketId: string, callback: (message: SupportMessage) => void) {
    return { unsubscribe: () => {} } as any;
  }
};
