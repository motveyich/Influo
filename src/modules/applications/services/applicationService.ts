import { apiClient } from '../../../core/api';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export interface CreateApplicationParams {
  cardId: string;
  cardType: 'influencer' | 'advertiser';
  message?: string;
  proposedRate?: number;
  timeline?: string;
  deliverables?: string[];
  additionalInfo?: string;
}

export class ApplicationService {
  async createApplication(params: CreateApplicationParams): Promise<Application> {
    try {
      const payload = {
        cardId: params.cardId,
        cardType: params.cardType,
        message: params.message || '',
        proposedRate: params.proposedRate,
        timeline: params.timeline,
        deliverables: params.deliverables,
        additionalInfo: params.additionalInfo,
      };

      const application = await apiClient.post<Application>('/applications', payload);

      analytics.track('application_created', {
        application_id: application.id,
        card_type: params.cardType,
        card_id: params.cardId
      });

      return application;
    } catch (error: any) {
      console.error('Failed to create application:', error);

      if (error.message?.includes('already applied')) {
        throw new Error('Вы уже отправили заявку на эту карточку');
      } else if (error.message?.includes('own card')) {
        throw new Error('Нельзя откликнуться на свою карточку');
      } else if (error.status === 409 || error.statusCode === 409) {
        throw new Error('Вы уже отправили заявку на эту карточку');
      }

      throw error;
    }
  }

  async getApplications(params?: { status?: string; asOwner?: boolean }): Promise<Application[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.asOwner !== undefined) queryParams.append('asOwner', String(params.asOwner));

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await apiClient.get<Application[]>(`/applications${queryString}`);
    } catch (error) {
      console.error('Failed to get applications:', error);
      throw error;
    }
  }

  async getApplicationsByParticipant(userId: string): Promise<Application[]> {
    try {
      return this.getApplications();
    } catch (error) {
      console.error('Failed to get applications by participant:', error);
      throw error;
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
      return await apiClient.post<Application>(`/applications/${applicationId}/decline`);
    } catch (error) {
      console.error('Failed to reject application:', error);
      throw error;
    }
  }

  async markInProgress(applicationId: string): Promise<Application> {
    try {
      return await apiClient.post<Application>(`/applications/${applicationId}/in-progress`);
    } catch (error) {
      console.error('Failed to mark application in progress:', error);
      throw error;
    }
  }

  async markCompleted(applicationId: string): Promise<Application> {
    try {
      return await apiClient.post<Application>(`/applications/${applicationId}/complete`);
    } catch (error) {
      console.error('Failed to mark application completed:', error);
      throw error;
    }
  }

  async terminateApplication(applicationId: string): Promise<Application> {
    try {
      return await apiClient.post<Application>(`/applications/${applicationId}/terminate`);
    } catch (error) {
      console.error('Failed to terminate application:', error);
      throw error;
    }
  }

  async cancelApplication(applicationId: string): Promise<Application> {
    try {
      return await apiClient.post<Application>(`/applications/${applicationId}/cancel`);
    } catch (error) {
      console.error('Failed to cancel application:', error);
      throw error;
    }
  }
}

export const applicationService = new ApplicationService();
