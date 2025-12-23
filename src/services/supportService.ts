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
    const { data: ticket, error } = await supabase
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

    if (error) throw new Error(error.message);

    if (ticket) {
      await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: userId,
        message: data.message,
        is_staff_response: false
      });
    }

    return ticket;
  },

  async getUserTickets(userId: string): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        support_messages (count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.support_messages?.[0]?.count || 0,
      messages: []
    }));
  },

  async getAllTickets(): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        support_messages (count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.support_messages?.[0]?.count || 0,
      messages: []
    }));
  },

  async getTicketById(ticketId: string): Promise<TicketWithMessages | null> {
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError || !ticket) return null;

    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

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

    if (error) throw new Error(error.message);

    return data;
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status'], resolvedAt?: string): Promise<void> {
    const payload: any = { status };
    if (status === 'resolved' || status === 'closed') {
      payload.resolved_at = resolvedAt || new Date().toISOString();
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(payload)
      .eq('id', ticketId);

    if (error) throw new Error(error.message);
  },

  async assignTicket(ticketId: string, assignedTo: string | null): Promise<void> {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: assignedTo,
        status: assignedTo ? 'in_progress' : 'open'
      })
      .eq('id', ticketId);

    if (error) throw new Error(error.message);
  },

  async closeTicket(ticketId: string): Promise<void> {
    await this.updateTicketStatus(ticketId, 'closed');
  },

  async getTicketsByStatus(status: SupportTicket['status']): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        support_messages (count)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.support_messages?.[0]?.count || 0,
      messages: []
    }));
  },

  async getAssignedTickets(userId: string): Promise<TicketWithMessages[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        support_messages (count)
      `)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(ticket => ({
      ...ticket,
      message_count: ticket.support_messages?.[0]?.count || 0,
      messages: []
    }));
  },

  async getStatistics(): Promise<any> {
    const { count: openCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const { count: inProgressCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    const { count: resolvedCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    return {
      open: openCount || 0,
      in_progress: inProgressCount || 0,
      resolved: resolvedCount || 0
    };
  },

  subscribeToTicket(ticketId: string, callback: (message: SupportMessage) => void) {
    const channel = supabase
      .channel(`ticket-${ticketId}`)
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

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      }
    };
  }
};
