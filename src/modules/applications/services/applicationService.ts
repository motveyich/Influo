import { apiClient, showFeatureNotImplemented } from '../../../core/api';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ApplicationService {
  async createApplication(applicationData: Partial<Application>): Promise<Application> {
    showFeatureNotImplemented('Applications system', 'POST /applications');
    throw new Error('Applications are not yet implemented in the backend');
  }

  async respondToApplication(
    applicationId: string,
    response: 'accepted' | 'declined' | 'in_progress',
    responseData?: any
  ): Promise<Application> {
    showFeatureNotImplemented('Application responses', 'POST /applications/{id}/respond');
    throw new Error('Applications are not yet implemented in the backend');
  }

  async getUserApplications(userId: string, type: 'sent' | 'received'): Promise<Application[]> {
    console.warn('Applications not yet implemented in backend, returning empty list');
    return [];
  }

  async getApplication(applicationId: string): Promise<Application | null> {
    console.warn('Applications not yet implemented in backend');
    return null;
  }

  async markApplicationAsViewed(applicationId: string): Promise<void> {
    console.warn('Applications not yet implemented in backend');
  }

  async cancelApplication(applicationId: string): Promise<void> {
    showFeatureNotImplemented('Cancel application', 'POST /applications/{id}/cancel');
    throw new Error('Applications are not yet implemented in the backend');
  }

  private transformFromDatabase(dbData: any): Application {
    return {
      id: dbData.id,
      applicantId: dbData.applicant_id,
      targetId: dbData.target_id,
      targetType: dbData.target_type,
      targetReferenceId: dbData.target_reference_id,
      applicationData: dbData.application_data,
      status: dbData.status,
      responseData: dbData.response_data,
      timeline: dbData.timeline,
      metadata: dbData.metadata || { viewCount: 0 },
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const applicationService = new ApplicationService();
