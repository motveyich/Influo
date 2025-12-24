import { supabase } from '../../../core/supabase';
import { showFeatureNotImplemented } from '../../../core/utils';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ApplicationService {
  async createApplication(applicationData: Partial<Application>): Promise<Application> {
    try {
      const now = new Date().toISOString();

      const payload = {
        applicant_id: applicationData.applicantId,
        target_id: applicationData.targetId,
        target_type: applicationData.targetType,
        target_reference_id: applicationData.targetReferenceId,
        application_data: applicationData.applicationData || {},
        status: 'sent',
        response_data: {},
        timeline: {
          pendingAt: now
        },
        metadata: {
          viewCount: 0
        }
      };

      const { data, error } = await supabase
        .from('applications')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      analytics.track('application_created', {
        applicant_id: applicationData.applicantId,
        target_type: applicationData.targetType,
        target_reference_id: applicationData.targetReferenceId
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to create application:', error);
      throw error;
    }
  }

  async respondToApplication(
    applicationId: string,
    response: 'accepted' | 'declined' | 'in_progress',
    responseData?: any
  ): Promise<Application> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: existingApp, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .eq('target_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existingApp) throw new Error('Application not found or access denied');

      const now = new Date().toISOString();
      const updatedTimeline = {
        ...existingApp.timeline,
        respondedAt: now
      };

      if (response === 'completed') {
        updatedTimeline.completedAt = now;
      }

      const { data, error } = await supabase
        .from('applications')
        .update({
          status: response,
          response_data: responseData || {},
          timeline: updatedTimeline
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      analytics.track('application_responded', {
        application_id: applicationId,
        response: response
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to respond to application:', error);
      throw error;
    }
  }

  async getUserApplications(userId: string, type: 'sent' | 'received'): Promise<Application[]> {
    try {
      const column = type === 'sent' ? 'applicant_id' : 'target_id';

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(app => this.transformFromDatabase(app));
    } catch (error) {
      console.error('Failed to get user applications:', error);
      return [];
    }
  }

  async getApplication(applicationId: string): Promise<Application | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .or(`applicant_id.eq.${user.id},target_id.eq.${user.id}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get application:', error);
      return null;
    }
  }

  async markApplicationAsViewed(applicationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingApp } = await supabase
        .from('applications')
        .select('metadata')
        .eq('id', applicationId)
        .eq('target_id', user.id)
        .maybeSingle();

      if (!existingApp) return;

      const now = new Date().toISOString();
      const updatedMetadata = {
        ...existingApp.metadata,
        viewCount: (existingApp.metadata?.viewCount || 0) + 1,
        lastViewed: now
      };

      await supabase
        .from('applications')
        .update({ metadata: updatedMetadata })
        .eq('id', applicationId);
    } catch (error) {
      console.error('Failed to mark application as viewed:', error);
    }
  }

  async cancelApplication(applicationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: existingApp, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .eq('applicant_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existingApp) throw new Error('Application not found or access denied');

      const now = new Date().toISOString();
      const updatedTimeline = {
        ...existingApp.timeline,
        cancelledAt: now
      };

      const { error } = await supabase
        .from('applications')
        .update({
          status: 'cancelled',
          timeline: updatedTimeline
        })
        .eq('id', applicationId);

      if (error) throw error;

      analytics.track('application_cancelled', {
        application_id: applicationId
      });
    } catch (error) {
      console.error('Failed to cancel application:', error);
      throw error;
    }
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
