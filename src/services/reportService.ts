import { supabase } from '../core/supabase';
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
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get user reports:', error);
        return [];
      }

      return (data || []).map(report => this.transformFromDb(report));
    } catch (error) {
      console.error('Failed to get user reports:', error);
      return [];
    }
  }

  private transformFromDb(dbData: any): ContentReport {
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
}

export const reportService = new ReportService();
