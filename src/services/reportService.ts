import { apiClient } from '../core/api';
import { ContentReport, ReportType } from '../core/types';
import { moderationService } from './moderationService';
import { analytics } from '../core/analytics';

export class ReportService {
  async createReport(
    reporterId: string,
    targetType: 'user_profile' | 'influencer_card' | 'campaign' | 'chat_message' | 'offer',
    targetId: string,
    reportType: ReportType,
    description: string,
    evidence?: Record<string, any>
  ): Promise<ContentReport> {
    try {
      const reportData: Partial<ContentReport> = {
        reporterId,
        targetType,
        targetId,
        reportType,
        description,
        evidence: evidence || {}
      };

      const report = await moderationService.createReport(reportData);

      analytics.track('content_reported', {
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        report_type: reportType
      });

      return report;
    } catch (error) {
      console.error('Failed to create report:', error);
      throw error;
    }
  }

  async getUserReports(userId: string): Promise<ContentReport[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/moderation/reports?reporterId=${userId}`);

      if (error) {
        console.error('Failed to get user reports:', error);
        return [];
      }

      return (data || []).map(report => this.transformFromApi(report));
    } catch (error) {
      console.error('Failed to get user reports:', error);
      return [];
    }
  }

  private transformFromApi(apiData: any): ContentReport {
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
}

export const reportService = new ReportService();
