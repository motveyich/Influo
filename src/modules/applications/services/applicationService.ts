import { supabase } from '../../../core/supabase';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ApplicationService {
  private transformApplication(data: any): Application {
    return {
      id: data.id,
      applicantId: data.applicant_id,
      targetId: data.card_id,
      targetType: data.card_type,
      targetReferenceId: data.campaign_id,
      applicationData: data.application_data,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createApplication(applicationData: Partial<Application>): Promise<Application> {
    try {
      this.validateApplicationData(applicationData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('applications')
        .insert({
          applicant_id: user.id,
          card_id: applicationData.targetId,
          card_type: applicationData.targetType,
          campaign_id: applicationData.targetReferenceId || null,
          application_data: applicationData.applicationData,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      const application = this.transformApplication(data);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('applications')
        .select('*')
        .eq('applicant_id', user.id);

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => this.transformApplication(item));
    } catch (error) {
      console.error('Failed to get applications:', error);
      throw error;
    }
  }

  async getApplication(applicationId: string): Promise<Application> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (error) throw error;

      return this.transformApplication(data);
    } catch (error) {
      console.error('Failed to get application:', error);
      throw error;
    }
  }

  async acceptApplication(applicationId: string): Promise<Application> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      return this.transformApplication(data);
    } catch (error) {
      console.error('Failed to accept application:', error);
      throw error;
    }
  }

  async rejectApplication(applicationId: string): Promise<Application> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      return this.transformApplication(data);
    } catch (error) {
      console.error('Failed to reject application:', error);
      throw error;
    }
  }

  private validateApplicationData(applicationData: Partial<Application>): void {
    if (!applicationData.targetId || !applicationData.targetType) {
      throw new Error('Target ID and type are required');
    }
    if (!applicationData.applicationData) {
      throw new Error('Application data is required');
    }
  }
}

export const applicationService = new ApplicationService();
