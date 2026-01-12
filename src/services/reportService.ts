import { ContentReport, ReportType } from '../core/types';
import { apiClient } from '../core/api';
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
      const ticketData = {
        subject: `Жалоба: ${this.getReportTypeLabel(reportType)}`,
        description: description,
        category: 'complaint',
        priority: 'medium',
        metadata: {
          reportType,
          targetType,
          targetId,
          evidence: evidence || {}
        }
      };

      const ticket = await apiClient.post<any>('/support/tickets', ticketData);

      analytics.track('content_reported', {
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        report_type: reportType
      });

      return this.transformTicketToReport(ticket, reporterId, targetType, targetId, reportType);
    } catch (error: any) {
      console.error('Failed to create report:', error);
      throw new Error(error.message || 'Не удалось отправить жалобу');
    }
  }

  private getReportTypeLabel(reportType: ReportType): string {
    const labels: Record<ReportType, string> = {
      scam: 'Мошенничество',
      spam: 'Спам',
      misleading: 'Введение в заблуждение',
      harassment: 'Домогательства',
      inappropriate: 'Неприемлемый контент',
      other: 'Другое'
    };
    return labels[reportType] || 'Жалоба';
  }

  private transformTicketToReport(
    ticket: any,
    reporterId: string,
    targetType: string,
    targetId: string,
    reportType: ReportType
  ): ContentReport {
    return {
      id: ticket.id,
      reporterId,
      targetType,
      targetId,
      reportType,
      description: ticket.description,
      evidence: ticket.metadata?.evidence || {},
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      resolutionNotes: null,
      priority: ticket.priority,
      metadata: ticket.metadata || {},
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    };
  }

  async getUserReports(userId: string): Promise<ContentReport[]> {
    try {
      const tickets = await apiClient.get<any[]>('/support/tickets?category=complaint');

      return tickets
        .filter(ticket => ticket.metadata?.reportType)
        .map(ticket => ({
          id: ticket.id,
          reporterId: ticket.user_id,
          targetType: ticket.metadata?.targetType || 'unknown',
          targetId: ticket.metadata?.targetId || '',
          reportType: ticket.metadata?.reportType || 'other',
          description: ticket.description,
          evidence: ticket.metadata?.evidence || {},
          status: this.mapTicketStatusToReportStatus(ticket.status),
          reviewedBy: ticket.assigned_to || null,
          reviewedAt: ticket.resolved_at || null,
          resolutionNotes: ticket.resolution_notes || null,
          priority: ticket.priority,
          metadata: ticket.metadata || {},
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at
        }));
    } catch (error) {
      console.error('Failed to get user reports:', error);
      return [];
    }
  }

  private mapTicketStatusToReportStatus(ticketStatus: string): string {
    const statusMap: Record<string, string> = {
      'open': 'pending',
      'in_progress': 'under_review',
      'resolved': 'resolved',
      'closed': 'resolved'
    };
    return statusMap[ticketStatus] || 'pending';
  }
}

export const reportService = new ReportService();