import { TABLES } from '../core/supabase';
import { ContentReport, ModerationQueueItem, ContentFilter, ReportType, ModerationStatus } from '../core/types';
import { adminService } from './adminService';
import { apiClient } from '../core/api';

export class ModerationService {
  private contentFilters: ContentFilter[] = [];

  constructor() {
    // Content filters loaded via API when needed
  }

  async loadContentFilters(): Promise<void> {
    try {
      const data = await apiClient.get<any[]>('/moderation/filters?isActive=true');
      this.contentFilters = data.map(filter => this.transformFilterFromDatabase(filter));
    } catch (error) {
      console.warn('Failed to load content filters, using empty filters:', error);
      this.contentFilters = [];
    }
  }

  async createReport(reportData: Partial<ContentReport>): Promise<ContentReport> {
    try {
      const newReport = {
        reporterId: reportData.reporterId,
        targetType: reportData.targetType,
        targetId: reportData.targetId,
        reportType: reportData.reportType,
        description: reportData.description,
        evidence: reportData.evidence || {},
        priority: this.calculateReportPriority(reportData.reportType!),
        metadata: reportData.metadata || {}
      };

      const data = await apiClient.post<any>('/moderation/reports', newReport);

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
      const params = new URLSearchParams();

      if (filters?.status) {
        params.append('status', filters.status);
      }

      if (filters?.reportType) {
        params.append('type', filters.reportType);
      }

      if (filters?.priority) {
        params.append('priority', String(filters.priority));
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/moderation/reports?${queryString}` : '/moderation/reports';

      const data = await apiClient.get<any[]>(endpoint);

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
      const data = await apiClient.patch<any>(`/moderation/reports/${reportId}`, {
        status: resolution,
        resolution: notes
      });

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
      const params = new URLSearchParams();

      if (filters?.status) {
        params.append('status', filters.status);
      }

      if (filters?.contentType) {
        params.append('contentType', filters.contentType);
      }

      if (filters?.assignedModerator) {
        params.append('assignedModerator', filters.assignedModerator);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/moderation/queue?${queryString}` : '/moderation/queue';

      const data = await apiClient.get<any[]>(endpoint);

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
      const queueItem = {
        contentType,
        contentId,
        moderationStatus: 'pending' as ModerationStatus,
        flaggedReasons: [],
        autoFlagged: metadata?.auto_flagged || false,
        filterMatches: metadata?.filter_matches || {},
        priority: metadata?.priority || 1,
        metadata: metadata || {}
      };

      const data = await apiClient.post<any>('/moderation/queue', queueItem);

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
      const data = await apiClient.patch<any>(`/moderation/queue/${queueItemId}`, {
        status: decision,
        moderationNotes: notes
      });

      const queueItem = this.transformQueueItemFromDatabase(data);

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
      let endpoint = '';

      switch (contentType) {
        case 'user_profile':
          endpoint = `/profiles/${contentId}`;
          break;
        case 'influencer_card':
          endpoint = `/influencer-cards/${contentId}`;
          break;
        case 'campaign':
          endpoint = `/auto-campaigns/${contentId}`;
          break;
        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      const data = await apiClient.get<any>(endpoint);
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
      let endpoint = '';

      switch (contentType) {
        case 'influencer_card':
          endpoint = `/influencer-cards/${contentId}`;
          break;
        case 'campaign':
          endpoint = `/auto-campaigns/${contentId}`;
          break;
        default:
          return; // Skip for unsupported types
      }

      await apiClient.patch(endpoint, { moderationStatus: status });
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