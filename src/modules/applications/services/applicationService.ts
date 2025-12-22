import { apiClient } from '../../../core/api';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ApplicationService {
  async createApplication(applicationData: Partial<Application>): Promise<Application> {
    try {
      this.validateApplicationData(applicationData);

      const cardType = applicationData.targetType?.replace('_card', '') as 'influencer' | 'advertiser';

      const payload = {
        cardId: applicationData.targetReferenceId,
        cardType,
        message: applicationData.applicationData?.message || '',
      };

      const application = await apiClient.post<Application>('/applications', payload);

      analytics.track('application_created', {
        application_id: application.id,
        target_type: applicationData.targetType,
        target_id: applicationData.targetId
      });

      return application;
    } catch (error) {
      console.error('Failed to create application:', error);
      throw error;
    }
  }

  async getApplications(params?: { status?: string }): Promise<Application[]> {
    try {
      let queryString = '';
      if (params?.status) {
        queryString = `?status=${params.status}`;
      }
      const applications = await apiClient.get<Application[]>(`/applications${queryString}`);
      return Array.isArray(applications) ? applications : [];
    } catch (error) {
      console.error('Failed to get applications:', error);
      return [];
    }
  }

  async getApplication(applicationId: string): Promise<Application> {
    try {
      return await apiClient.get<Application>(`/applications/${applicationId}`);
    } catch (error) {
      console.error('Failed to get application:', error);
      throw error;
    }
  }

  async acceptApplication(applicationId: string): Promise<Application> {
    try {
      return await apiClient.post<Application>(`/applications/${applicationId}/accept`);
    } catch (error) {
      console.error('Failed to accept application:', error);
      throw error;
    }
  }

  async rejectApplication(applicationId: string): Promise<Application> {
    try {
      return await apiClient.post<Application>(`/applications/${applicationId}/reject`);
    } catch (error) {
      console.error('Failed to reject application:', error);
      throw error;
    }
  }

  private validateApplicationData(applicationData: Partial<Application>): void {
    if (!applicationData.targetReferenceId || !applicationData.targetType) {
      throw new Error('Card ID and type are required');
    }
  }
}

export const applicationService = new ApplicationService();
