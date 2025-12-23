import { apiClient, showFeatureNotImplemented } from '../core/api';
import { ContentReport, ModerationQueueItem, ContentFilter, ReportType, ModerationStatus } from '../core/types';

export class ModerationService {
  private contentFilters: ContentFilter[] = [];

  constructor() {
    this.loadContentFilters();
  }

  async loadContentFilters(): Promise<void> {
    try {
      const { data, error } = await apiClient.get<any[]>('/moderation/content-filters');

      if (error) {
        console.warn('Content filters not available yet:', error);
        this.contentFilters = [];
        return;
      }

      this.contentFilters = (data || []).map(filter => this.transformFilterFromApi(filter));
    } catch (error) {
      console.warn('Failed to load content filters, using empty filters:', error);
      this.contentFilters = [];
    }
  }

  async createReport(reportData: Partial<ContentReport>): Promise<ContentReport> {
    try {
      const payload = {
        reporterId: reportData.reporterId,
        targetType: reportData.targetType,
        targetId: reportData.targetId,
        reportType: reportData.reportType,
        description: reportData.description,
        evidence: reportData.evidence || {},
        metadata: reportData.metadata || {}
      };

      const { data, error } = await apiClient.post<any>('/moderation/reports', payload);

      if (error) throw new Error(error.message);

      return this.transformReportFromApi(data);
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
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.reportType) params.append('reportType', filters.reportType);
      if (filters?.priority) params.append('priority', String(filters.priority));

      const queryString = params.toString();
      const endpoint = queryString ? `/moderation/reports?${queryString}` : '/moderation/reports';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) throw new Error(error.message);

      return (data || []).map(report => this.transformReportFromApi(report));
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
      const { data, error } = await apiClient.post<any>(`/moderation/reports/${reportId}/resolve`, {
        resolution,
        notes,
        reviewedBy
      });

      if (error) throw new Error(error.message);

      return this.transformReportFromApi(data);
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
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.contentType) params.append('contentType', filters.contentType);
      if (filters?.assignedModerator) params.append('assignedModerator', filters.assignedModerator);

      const queryString = params.toString();
      const endpoint = queryString ? `/moderation/queue?${queryString}` : '/moderation/queue';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) throw new Error(error.message);

      return (data || []).map(item => this.transformQueueItemFromApi(item));
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
      const { data, error } = await apiClient.post<any>('/moderation/queue', {
        contentType,
        contentId,
        metadata: metadata || {}
      });

      if (error) throw new Error(error.message);

      return this.transformQueueItemFromApi(data);
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
      const { data, error } = await apiClient.post<any>(`/moderation/queue/${queueItemId}/moderate`, {
        decision,
        notes,
        moderatorId
      });

      if (error) throw new Error(error.message);

      return this.transformQueueItemFromApi(data);
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

  private transformReportFromApi(apiData: any): ContentReport {
    return {
      id: apiData.id,
      reporterId: apiData.reporterId || apiData.reporter_id,
      targetType: apiData.targetType || apiData.target_type,
      targetId: apiData.targetId || apiData.target_id,
      reportType: apiData.reportType || apiData.report_type,
      description: apiData.description,
      evidence: apiData.evidence || {},
      status: apiData.status,
      reviewedBy: apiData.reviewedBy || apiData.reviewed_by,
      reviewedAt: apiData.reviewedAt || apiData.reviewed_at,
      resolutionNotes: apiData.resolutionNotes || apiData.resolution_notes,
      priority: apiData.priority,
      metadata: apiData.metadata || {},
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }

  private transformQueueItemFromApi(apiData: any): ModerationQueueItem {
    return {
      id: apiData.id,
      contentType: apiData.contentType || apiData.content_type,
      contentId: apiData.contentId || apiData.content_id,
      contentData: apiData.contentData || apiData.content_data || {},
      moderationStatus: apiData.moderationStatus || apiData.moderation_status,
      flaggedReasons: apiData.flaggedReasons || apiData.flagged_reasons || [],
      autoFlagged: apiData.autoFlagged ?? apiData.auto_flagged,
      filterMatches: apiData.filterMatches || apiData.filter_matches || {},
      assignedModerator: apiData.assignedModerator || apiData.assigned_moderator,
      reviewedAt: apiData.reviewedAt || apiData.reviewed_at,
      reviewNotes: apiData.reviewNotes || apiData.review_notes,
      priority: apiData.priority,
      metadata: apiData.metadata || {},
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }

  private transformFilterFromApi(apiData: any): ContentFilter {
    return {
      id: apiData.id,
      filterName: apiData.filterName || apiData.filter_name,
      filterType: apiData.filterType || apiData.filter_type,
      pattern: apiData.pattern,
      isRegex: apiData.isRegex ?? apiData.is_regex,
      isActive: apiData.isActive ?? apiData.is_active,
      severity: apiData.severity,
      action: apiData.action,
      createdBy: apiData.createdBy || apiData.created_by,
      metadata: apiData.metadata || {},
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }
}

export const moderationService = new ModerationService();
