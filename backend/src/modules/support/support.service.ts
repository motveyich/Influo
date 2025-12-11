import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateTicketDto, UpdateTicketDto, CreateMessageDto } from './dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private supabaseService: SupabaseService) {}

  async createTicket(userId: string, createDto: CreateTicketDto) {
    const supabase = this.supabaseService.getAdminClient();

    const ticketData = {
      user_id: userId,
      subject: createDto.subject,
      category: createDto.category,
      priority: createDto.priority || 'normal',
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert(ticketData)
      .select()
      .single();

    if (ticketError) {
      this.logger.error(`Failed to create ticket: ${ticketError.message}`, ticketError);
      throw new ConflictException('Failed to create support ticket');
    }

    const messageData = {
      ticket_id: ticket.id,
      sender_id: userId,
      message: createDto.message,
      is_staff_response: false,
      created_at: new Date().toISOString(),
    };

    const { error: messageError } = await supabase.from('support_messages').insert(messageData);

    if (messageError) {
      this.logger.error(`Failed to create initial message: ${messageError.message}`, messageError);
    }

    return this.transformTicket(ticket);
  }

  async findAllTickets(userId: string, isStaff: boolean, filters?: { status?: string; priority?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_profiles!support_tickets_user_id_fkey(*),
        assigned:user_profiles!support_tickets_assigned_to_fkey(*)
      `);

    if (!isStaff) {
      query = query.eq('user_id', userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data: tickets, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch tickets: ${error.message}`, error);
      return [];
    }

    return tickets.map((ticket) => this.transformTicket(ticket));
  }

  async findOneTicket(id: string, userId: string, isStaff: boolean) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_profiles!support_tickets_user_id_fkey(*),
        assigned:user_profiles!support_tickets_assigned_to_fkey(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (!isStaff && ticket.user_id !== userId) {
      throw new ForbiddenException('You can only view your own tickets');
    }

    return this.transformTicket(ticket);
  }

  async updateTicket(id: string, userId: string, isStaff: boolean, updateDto: UpdateTicketDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingTicket } = await supabase
      .from('support_tickets')
      .select('user_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!existingTicket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (!isStaff && existingTicket.user_id !== userId) {
      throw new ForbiddenException('You can only update your own tickets');
    }

    if (!isStaff && updateDto.status && updateDto.status !== 'closed') {
      throw new ForbiddenException('Users can only close their own tickets');
    }

    if (!isStaff && (updateDto.priority || updateDto.assignedTo)) {
      throw new ForbiddenException('Only staff can update priority and assignment');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateDto.status) {
      updateData.status = updateDto.status;
      if (updateDto.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
    }

    if (updateDto.priority) {
      updateData.priority = updateDto.priority;
    }

    if (updateDto.assignedTo !== undefined) {
      updateData.assigned_to = updateDto.assignedTo;
    }

    const { data: updated, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user:user_profiles!support_tickets_user_id_fkey(*),
        assigned:user_profiles!support_tickets_assigned_to_fkey(*)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to update ticket: ${error.message}`, error);
      throw new ConflictException('Failed to update support ticket');
    }

    return this.transformTicket(updated);
  }

  async addMessage(ticketId: string, userId: string, isStaff: boolean, createDto: CreateMessageDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id, status')
      .eq('id', ticketId)
      .maybeSingle();

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (!isStaff && ticket.user_id !== userId) {
      throw new ForbiddenException('You can only add messages to your own tickets');
    }

    if (ticket.status === 'closed') {
      throw new BadRequestException('Cannot add messages to closed tickets');
    }

    if (!isStaff && createDto.isStaffResponse) {
      throw new ForbiddenException('Only staff can create staff responses');
    }

    const messageData = {
      ticket_id: ticketId,
      sender_id: userId,
      message: createDto.message,
      is_staff_response: isStaff && createDto.isStaffResponse,
      created_at: new Date().toISOString(),
    };

    const { data: message, error } = await supabase
      .from('support_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create message: ${error.message}`, error);
      throw new ConflictException('Failed to create message');
    }

    return this.transformMessage(message);
  }

  async getTicketMessages(ticketId: string, userId: string, isStaff: boolean) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id')
      .eq('id', ticketId)
      .maybeSingle();

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (!isStaff && ticket.user_id !== userId) {
      throw new ForbiddenException('You can only view messages from your own tickets');
    }

    const { data: messages, error } = await supabase
      .from('support_messages')
      .select(`
        *,
        sender:user_profiles!support_messages_sender_id_fkey(*)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch messages: ${error.message}`, error);
      return [];
    }

    return messages.map((message) => this.transformMessage(message));
  }

  async getStatistics(userId?: string) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase.from('support_tickets').select('status, priority');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: tickets } = await query;

    if (!tickets || tickets.length === 0) {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
      };
    }

    const stats = tickets.reduce(
      (acc, t) => {
        acc.total++;
        const statusKey = t.status.replace('_', '').toLowerCase();
        if (statusKey === 'open') acc.open++;
        else if (statusKey === 'inprogress') acc.inprogress++;
        else if (statusKey === 'resolved') acc.resolved++;
        else if (statusKey === 'closed') acc.closed++;

        const priorityKey = t.priority;
        if (priorityKey === 'low') acc.byPriority.low++;
        else if (priorityKey === 'normal') acc.byPriority.normal++;
        else if (priorityKey === 'high') acc.byPriority.high++;
        else if (priorityKey === 'urgent') acc.byPriority.urgent++;

        return acc;
      },
      {
        total: 0,
        open: 0,
        inprogress: 0,
        resolved: 0,
        closed: 0,
        byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
      },
    );

    return {
      total: stats.total,
      open: stats.open,
      inProgress: stats.inprogress,
      resolved: stats.resolved,
      closed: stats.closed,
      byPriority: stats.byPriority,
    };
  }

  private transformTicket(ticket: any) {
    return {
      id: ticket.id,
      userId: ticket.user_id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      assignedTo: ticket.assigned_to,
      resolvedAt: ticket.resolved_at,
      user: ticket.user
        ? {
            id: ticket.user.user_id,
            fullName: ticket.user.full_name,
            username: ticket.user.username,
            avatar: ticket.user.avatar,
          }
        : undefined,
      assigned: ticket.assigned
        ? {
            id: ticket.assigned.user_id,
            fullName: ticket.assigned.full_name,
            username: ticket.assigned.username,
          }
        : undefined,
    };
  }

  private transformMessage(message: any) {
    return {
      id: message.id,
      ticketId: message.ticket_id,
      senderId: message.sender_id,
      message: message.message,
      isStaffResponse: message.is_staff_response,
      createdAt: message.created_at,
      attachments: message.attachments,
      sender: message.sender
        ? {
            id: message.sender.user_id,
            fullName: message.sender.full_name,
            username: message.sender.username,
            avatar: message.sender.avatar,
          }
        : undefined,
    };
  }

  private async isUserStaff(userId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: role } = await supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', userId)
      .in('role', ['admin', 'moderator'])
      .eq('is_active', true)
      .maybeSingle();

    return !!role;
  }
}
