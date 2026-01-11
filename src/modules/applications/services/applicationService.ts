import { apiClient } from '../../../core/api';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export interface CreateApplicationParams {
  cardId: string;
  cardType: 'influencer' | 'advertiser';
  message?: string;
}

export class ApplicationService {
  async createApplication(params: CreateApplicationParams): Promise<Application> {
    try {
      const payload = {
        cardId: params.cardId,
        cardType: params.cardType,
        message: params.message || '',
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

  async getApplications(params?: { status?: string }): Promise<Application[]> {
    try {
      let queryString = '';
      if (params?.status) {
        queryString = `?status=${params.status}`;
      }
      return await apiClient.get<Application[]>(`/applications${queryString}`);
    } catch (error) {
      console.error('Failed to get applications:', error);
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
      return await apiClient.post<Application>(`/applications/${applicationId}/reject`);
    } catch (error) {
      console.error('Failed to reject application:', error);
      throw error;
    }
  }
}

export const applicationService = new ApplicationService();
