import { database } from '../core/database';
import { ContentReport, ModerationQueueItem, ContentFilter, ReportType, ModerationStatus } from '../core/types';

export class ModerationService {
  private contentFilters: ContentFilter[] = [];

  constructor() {
    this.loadContentFilters();
  }

  async loadContentFilters(): Promise<void> {
    try {
      const { data, error } = await database
        .from('content_filters')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.warn('Content filters not available yet:', error);
        this.contentFilters = [];
        return;
      }

      this.contentFilters = (data || []).map(filter => this.transformFilterFromDb(filter));
    } catch (error) {
      console.warn('Failed to load content filters, using empty filters:', error);
      this.contentFilters = [];
    }
  }

  async createReport(reportData: Partial<ContentReport>): Promise<ContentReport> {
    try {
      const { data, error } = await database
        .from('content_reports')
        .insert({
          reporter_id: reportData.reporterId,
          target_type: reportData.targetType,
          target_id: reportData.targetId,
          report_type: reportData.reportType,
          description: reportData.description,
          evidence: reportData.evidence || {},
          metadata: reportData.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      return this.transformReportFromDb(data);
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
      let query = database
        .from('content_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.reportType) {
        query = query.eq('report_type', filters.reportType);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(report => this.transformReportFromDb(report));
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
      const { data, error } = await database
        .from('content_reports')
        .update({
          status: resolution,
          resolution_notes: notes,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      return this.transformReportFromDb(data);
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
      let query = database
        .from('moderation_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('moderation_status', filters.status);
      }

      if (filters?.contentType) {
        query = query.eq('content_type', filters.contentType);
      }

      if (filters?.assignedModerator) {
        query = query.eq('assigned_moderator', filters.assignedModerator);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => this.transformQueueItemFromDb(item));
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
      const { data, error } = await database
        .from('moderation_queue')
        .insert({
          content_type: contentType,
          content_id: contentId,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      return this.transformQueueItemFromDb(data);
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
      const { data, error } = await database
        .from('moderation_queue')
        .update({
          moderation_status: decision,
          review_notes: notes,
          assigned_moderator: moderatorId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', queueItemId)
        .select()
        .single();

      if (error) throw error;

      return this.transformQueueItemFromDb(data);
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
        shouldFlag: maxSeverity >= 3
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

  private transformReportFromDb(dbData: any): ContentReport {
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

  private transformQueueItemFromDb(dbData: any): ModerationQueueItem {
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

  private transformFilterFromDb(dbData: any): ContentFilter {
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
