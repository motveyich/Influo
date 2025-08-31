import { supabase, TABLES } from '../core/supabase';
import { ContentReport, ModerationQueueItem, ContentFilter, ReportType, ModerationStatus } from '../core/types';
import { adminService } from './adminService';
import { roleService } from './roleService';

export class ModerationService {
  private contentFilters: ContentFilter[] = [];

  constructor() {
    this.loadContentFilters();
  }

  async loadContentFilters(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONTENT_FILTERS)
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      this.contentFilters = data.map(filter => this.transformFilterFromDatabase(filter));
    } catch (error) {
      console.error('Failed to load content filters:', error);
    }
  }

  async createReport(reportData: Partial<ContentReport>): Promise<ContentReport> {
    try {
      const newReport = {
        reporter_id: reportData.reporterId,
        target_type: reportData.targetType,
        target_id: reportData.targetId,
        report_type: reportData.reportType,
        description: reportData.description,
        evidence: reportData.evidence || {},
        status: 'pending',
        priority: this.calculateReportPriority(reportData.reportType!),
        metadata: reportData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.CONTENT_REPORTS)
        .insert([newReport])
        .select()
        .single();

      if (error) throw error;

      // Add to moderation queue if high priority
      if (newReport.priority >= 4) {
        await this.addToModerationQueue(
          reportData.targetType!,
          reportData.targetId!,
          { report_id: data.id, auto_flagged: false }
        );
      }

      return this.transformReportFromDatabase(data);
    } catch (error) {
      console.error('Failed to create report:', error);
      throw error;
    }
  }

  async getReports(filters?: {
    status?: string;
    reportType?: ReportType;
    priority?: number;
  }): Promise<ContentReport[]> {
    try {
      let query = supabase
        .from(TABLES.CONTENT_REPORTS)
        .select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.reportType) {
        query = query.eq('report_type', filters.reportType);
      }

      if (filters?.priority) {
        query = query.gte('priority', filters.priority);
      }

      query = query.order('priority', { ascending: false })
                   .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(report => this.transformReportFromDatabase(report));
    } catch (error) {
      console.error('Failed to get reports:', error);
      throw error;
    }
  }

  async resolveReport(
    reportId: string,
    resolution: 'resolved' | 'dismissed',
    notes: string,
    reviewedBy: string
  ): Promise<ContentReport> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(reviewedBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const { data, error } = await supabase
        .from(TABLES.CONTENT_REPORTS)
        .update({
          status: resolution,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          resolution_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await adminService.logAction(reviewedBy, 'report_resolved', 'content_report', reportId, {
        resolution: resolution,
        notes: notes
      });

      return this.transformReportFromDatabase(data);
    } catch (error) {
      console.error('Failed to resolve report:', error);
      throw error;
    }
  }

  async getModerationQueue(filters?: {
    status?: ModerationStatus;
    contentType?: string;
    assignedModerator?: string;
  }): Promise<ModerationQueueItem[]> {
    try {
      let query = supabase
        .from(TABLES.MODERATION_QUEUE)
        .select('*');

      if (filters?.status) {
        query = query.eq('moderation_status', filters.status);
      }

      if (filters?.contentType) {
        query = query.eq('content_type', filters.contentType);
      }

      if (filters?.assignedModerator) {
        query = query.eq('assigned_moderator', filters.assignedModerator);
      }

      query = query.order('priority', { ascending: false })
                   .order('created_at', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(item => this.transformQueueItemFromDatabase(item));
    } catch (error) {
      console.error('Failed to get moderation queue:', error);
      throw error;
    }
  }

  async addToModerationQueue(
    contentType: string,
    contentId: string,
    metadata?: Record<string, any>
  ): Promise<ModerationQueueItem> {
    try {
      // Get content data
      const contentData = await this.getContentData(contentType, contentId);

      const queueItem = {
        content_type: contentType,
        content_id: contentId,
        content_data: contentData,
        moderation_status: 'pending' as ModerationStatus,
        flagged_reasons: [],
        auto_flagged: metadata?.auto_flagged || false,
        filter_matches: metadata?.filter_matches || {},
        priority: metadata?.priority || 1,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.MODERATION_QUEUE)
        .insert([queueItem])
        .select()
        .single();

      if (error) throw error;

      return this.transformQueueItemFromDatabase(data);
    } catch (error) {
      console.error('Failed to add to moderation queue:', error);
      throw error;
    }
  }

  async moderateContent(
    queueItemId: string,
    decision: ModerationStatus,
    notes: string,
    moderatorId: string
  ): Promise<ModerationQueueItem> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(moderatorId, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const { data, error } = await supabase
        .from(TABLES.MODERATION_QUEUE)
        .update({
          moderation_status: decision,
          assigned_moderator: moderatorId,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItemId)
        .select()
        .single();

      if (error) throw error;

      const queueItem = this.transformQueueItemFromDatabase(data);

      // Update original content moderation status
      await this.updateContentModerationStatus(
        queueItem.contentType,
        queueItem.contentId,
        decision
      );

      // Log the action
      await adminService.logAction(moderatorId, 'content_moderated', queueItem.contentType, queueItem.contentId, {
        decision: decision,
        notes: notes
      });

      return queueItem;
    } catch (error) {
      console.error('Failed to moderate content:', error);
      throw error;
    }
  }

  async checkContentForViolations(content: string, contentType: string): Promise<{
    hasViolations: boolean;
    matches: Array<{ filter: string; match: string; severity: number }>;
    shouldFlag: boolean;
  }> {
    try {
      const matches: Array<{ filter: string; match: string; severity: number }> = [];
      let maxSeverity = 0;

      for (const filter of this.contentFilters) {
        if (filter.isActive) {
          const regex = new RegExp(filter.pattern, 'gi');
          const filterMatches = content.match(regex);

          if (filterMatches) {
            matches.push({
              filter: filter.filterName,
              match: filterMatches[0],
              severity: filter.severity
            });
            maxSeverity = Math.max(maxSeverity, filter.severity);
          }
        }
      }

      return {
        hasViolations: matches.length > 0,
        matches: matches,
        shouldFlag: maxSeverity >= 3 // Flag if severity is 3 or higher
      };
    } catch (error) {
      console.error('Failed to check content for violations:', error);
      return {
        hasViolations: false,
        matches: [],
        shouldFlag: false
      };
    }
  }

  private async getContentData(contentType: string, contentId: string): Promise<any> {
    try {
      let table = '';
      let idField = '';

      switch (contentType) {
        case 'user_profile':
          table = TABLES.USER_PROFILES;
          idField = 'user_id';
          break;
        case 'influencer_card':
          table = TABLES.INFLUENCER_CARDS;
          idField = 'id';
          break;
        case 'campaign':
          table = TABLES.CAMPAIGNS;
          idField = 'campaign_id';
          break;
        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(idField, contentId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to get content data:', error);
      return {};
    }
  }

  private async updateContentModerationStatus(
    contentType: string,
    contentId: string,
    status: ModerationStatus
  ): Promise<void> {
    try {
      let table = '';
      let idField = '';

      switch (contentType) {
        case 'influencer_card':
          table = TABLES.INFLUENCER_CARDS;
          idField = 'id';
          break;
        case 'campaign':
          table = TABLES.CAMPAIGNS;
          idField = 'campaign_id';
          break;
        default:
          return; // Skip for unsupported types
      }

      const { error } = await supabase
        .from(table)
        .update({ moderation_status: status })
        .eq(idField, contentId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update content moderation status:', error);
    }
  }

  private calculateReportPriority(reportType: ReportType): number {
    switch (reportType) {
      case 'harassment':
        return 5;
      case 'inappropriate':
        return 4;
      case 'fake':
        return 3;
      case 'spam':
        return 2;
      case 'copyright':
        return 3;
      default:
        return 1;
    }
  }

  private transformReportFromDatabase(dbData: any): ContentReport {
    return {
      id: dbData.id,
      reporterId: dbData.reporter_id,
      targetType: dbData.target_type,
      targetId: dbData.target_id,
      reportType: dbData.report_type,
      description: dbData.description,
      evidence: dbData.evidence || {},
      status: dbData.status,
      reviewedBy: dbData.reviewed_by,
      reviewedAt: dbData.reviewed_at,
      resolutionNotes: dbData.resolution_notes,
      priority: dbData.priority,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformQueueItemFromDatabase(dbData: any): ModerationQueueItem {
    return {
      id: dbData.id,
      contentType: dbData.content_type,
      contentId: dbData.content_id,
      contentData: dbData.content_data || {},
      moderationStatus: dbData.moderation_status,
      flaggedReasons: dbData.flagged_reasons || [],
      autoFlagged: dbData.auto_flagged,
      filterMatches: dbData.filter_matches || {},
      assignedModerator: dbData.assigned_moderator,
      reviewedAt: dbData.reviewed_at,
      reviewNotes: dbData.review_notes,
      priority: dbData.priority,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformFilterFromDatabase(dbData: any): ContentFilter {
    return {
      id: dbData.id,
      filterName: dbData.filter_name,
      filterType: dbData.filter_type,
      pattern: dbData.pattern,
      isRegex: dbData.is_regex,
      isActive: dbData.is_active,
      severity: dbData.severity,
      action: dbData.action,
      createdBy: dbData.created_by,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const moderationService = new ModerationService();