import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

@Injectable()
export class ModerationService {
  constructor(private supabaseService: SupabaseService) {}

  async getReports(filters?: {
    status?: string;
    type?: string;
    limit?: number;
  }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('content_reports')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.type) {
      query = query.eq('report_type', filters.type);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch reports: ${error.message}`);
    }

    return data || [];
  }

  async getModerationQueue(filters?: {
    status?: string;
    contentType?: string;
    limit?: number;
  }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('moderation_queue')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.contentType) {
      query = query.eq('content_type', filters.contentType);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch moderation queue: ${error.message}`);
    }

    return data || [];
  }

  async updateReportStatus(reportId: string, status: string, moderatorId: string, moderatorRole: string, resolution?: string) {
    if (!['admin', 'moderator'].includes(moderatorRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('content_reports')
      .update({
        status,
        resolved_by: moderatorId,
        resolved_at: new Date().toISOString(),
        resolution: resolution || null
      })
      .eq('id', reportId)
      .select();

    if (error) {
      throw new BadRequestException(`Failed to update report: ${error.message}`);
    }

    return data;
  }

  async updateModerationQueueItem(itemId: string, status: string, moderatorId: string, moderatorRole: string, moderationNotes?: string) {
    if (!['admin', 'moderator'].includes(moderatorRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('moderation_queue')
      .update({
        status,
        moderated_by: moderatorId,
        moderated_at: new Date().toISOString(),
        moderation_notes: moderationNotes || null
      })
      .eq('id', itemId)
      .select();

    if (error) {
      throw new BadRequestException(`Failed to update moderation queue item: ${error.message}`);
    }

    return data;
  }

  async approveContent(itemId: string, moderatorId: string, moderatorRole: string) {
    return this.updateModerationQueueItem(itemId, 'approved', moderatorId, moderatorRole);
  }

  async rejectContent(itemId: string, moderatorId: string, moderatorRole: string, reason?: string) {
    return this.updateModerationQueueItem(itemId, 'rejected', moderatorId, moderatorRole, reason);
  }
}
