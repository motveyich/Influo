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
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
        status: 'open'
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    const { error: messageError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: userId,
        message: data.message,
        is_staff_response: false
      });

    if (messageError) throw messageError;

    return ticket;
  },

  async getUserTickets(userId: string): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        messages:support_messages(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(ticket => ({
      ...ticket,
      message_count: ticket.messages[0]?.count || 0,
      messages: []
    }));
  },

  async getAllTickets(): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        messages:support_messages(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(ticket => ({
      ...ticket,
      message_count: ticket.messages[0]?.count || 0,
      messages: []
    }));
  },

  async getTicketById(ticketId: string): Promise<TicketWithMessages | null> {
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) return null;

    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return {
      ...ticket,
      messages: messages || [],
      message_count: messages?.length || 0
    };
  },

  async addMessage(ticketId: string, senderId: string, message: string, isStaffResponse: boolean = false): Promise<SupportMessage> {
    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        message,
        is_staff_response: isStaffResponse
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status'], resolvedAt?: string): Promise<void> {
    const updateData: any = { status };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = resolvedAt || new Date().toISOString();
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) throw error;
  },

  async assignTicket(ticketId: string, assignedTo: string | null): Promise<void> {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: assignedTo,
        status: assignedTo ? 'in_progress' : 'open'
      })
      .eq('id', ticketId);

    if (error) throw error;
  },

  async closeTicket(ticketId: string): Promise<void> {
    await this.updateTicketStatus(ticketId, 'closed');
  },

  async getTicketsByStatus(status: SupportTicket['status']): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        messages:support_messages(count)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(ticket => ({
      ...ticket,
      message_count: ticket.messages[0]?.count || 0,
      messages: []
    }));
  },

  async getAssignedTickets(userId: string): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        messages:support_messages(count)
      `)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(ticket => ({
      ...ticket,
      message_count: ticket.messages[0]?.count || 0,
      messages: []
    }));
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
