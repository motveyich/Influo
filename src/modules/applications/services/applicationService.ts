import { supabase, TABLES } from '../../../core/supabase';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';
import { chatService } from '../../chat/services/chatService';

export class ApplicationService {
  async createApplication(applicationData: Partial<Application>): Promise<Application> {
    try {
      // Prevent creating applications to self
      if (applicationData.applicantId === applicationData.targetId) {
        throw new Error('Cannot create application to yourself');
      }
      
      // Check for existing application to prevent duplicates
      const { data: existingApplication } = await supabase
        .from('applications')
        .select('id')
        .eq('applicant_id', applicationData.applicantId)
        .eq('target_reference_id', applicationData.targetReferenceId)
        .eq('target_type', applicationData.targetType)
        .maybeSingle();

      if (existingApplication) {
        throw new Error('Вы уже отправили заявку на эту карточку');
      }
      
      this.validateApplicationData(applicationData);

      const newApplication = {
        applicant_id: applicationData.applicantId,
        target_id: applicationData.targetId,
        target_type: applicationData.targetType,
        target_reference_id: applicationData.targetReferenceId,
        application_data: applicationData.applicationData,
        status: 'sent',
        timeline: {
          sentAt: new Date().toISOString()
        },
        metadata: {
          viewCount: 0
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('applications')
        .insert([newApplication])
        .select()
        .single();

      if (error) throw error;

      const transformedApplication = this.transformFromDatabase(data);

      // Send notification message
      await this.sendApplicationNotification(transformedApplication);

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'application_received',
        data: transformedApplication,
        userId: applicationData.targetId!,
        timestamp: transformedApplication.timeline.sentAt
      });

      // Track analytics
      analytics.track('application_sent', {
        applicant_id: applicationData.applicantId,
        target_id: applicationData.targetId,
        target_type: applicationData.targetType,
        application_id: transformedApplication.id
      });

      return transformedApplication;
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
      const updateData: any = {
        status: response,
        response_data: responseData || {},
        timeline: {
          respondedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      };

      if (response === 'completed') {
        updateData.timeline.completedAt = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      const updatedApplication = this.transformFromDatabase(data);

      // Send response notification
      await this.sendResponseNotification(updatedApplication, response);

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'application_response',
        data: { ...updatedApplication, response },
        userId: updatedApplication.applicantId,
        timestamp: updatedApplication.timeline.respondedAt!
      });

      // Track analytics
      analytics.track('application_responded', {
        application_id: applicationId,
        response: response,
        target_id: updatedApplication.targetId
      });

      return updatedApplication;
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

      return data.map(app => this.transformFromDatabase(app));
    } catch (error) {
      console.error('Failed to get user applications:', error);
      throw error;
    }
  }

  async getApplication(applicationId: string): Promise<Application | null> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get application:', error);
      throw error;
    }
  }

  async markApplicationAsViewed(applicationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          metadata: supabase.raw(`
            jsonb_set(
              COALESCE(metadata, '{}'),
              '{viewCount}',
              (COALESCE(metadata->>'viewCount', '0')::int + 1)::text::jsonb
            )
          `),
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark application as viewed:', error);
    }
  }

  private async sendApplicationNotification(application: Application): Promise<void> {
    try {
      // Get applicant profile to show proper name
      const { data: applicantProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', application.applicantId)
        .single();

      const applicantName = applicantProfile?.full_name || 'пользователя';
      const messageContent = `Новая заявка на сотрудничество от ${applicantName}`;
      
      await chatService.sendMessage({
        senderId: application.applicantId,
        receiverId: application.targetId,
        messageContent: messageContent,
        messageType: 'offer',
        metadata: {
          applicationId: application.id,
          targetType: application.targetType,
          targetReferenceId: application.targetReferenceId
        }
      });
    } catch (error) {
      console.error('Failed to send application notification:', error);
    }
  }

  private async sendResponseNotification(application: Application, response: string): Promise<void> {
    try {
      // Get target profile to show proper name
      const { data: targetProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', application.targetId)
        .single();

      const targetName = targetProfile?.full_name || 'Пользователь';
      const messageContent = `Ваша заявка была ${
        response === 'accepted' ? 'принята' :
        response === 'declined' ? 'отклонена' :
        response === 'in_progress' ? 'взята в работу' : 'обновлена'
      } пользователем ${targetName}`;
      
      await chatService.sendMessage({
        senderId: application.targetId,
        receiverId: application.applicantId,
        messageContent: messageContent,
        messageType: 'offer',
        metadata: {
          applicationId: application.id,
          response: response
        }
      });
    } catch (error) {
      console.error('Failed to send response notification:', error);
    }
  }

  private validateApplicationData(applicationData: Partial<Application>): void {
    const errors: string[] = [];

    if (!applicationData.applicantId) errors.push('Applicant ID is required');
    if (!applicationData.targetId) errors.push('Target ID is required');
    if (applicationData.applicantId === applicationData.targetId) errors.push('Cannot create application to yourself');
    if (!applicationData.targetType) errors.push('Target type is required');
    if (!applicationData.targetReferenceId) errors.push('Target reference ID is required');
    
    if (!applicationData.applicationData) {
      errors.push('Application data is required');
    } else {
      if (!applicationData.applicationData.message?.trim()) {
        errors.push('Message is required');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  async withdrawApplication(applicationId: string): Promise<void> {
    try {
      console.log('=== WITHDRAW APPLICATION SERVICE START ===');
      console.log('Application ID:', applicationId);
      
      // First check if application exists
      const { data: existingApp, error: fetchError } = await supabase
        .from(TABLES.APPLICATIONS)
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();
      
      console.log('Existing application:', existingApp);
      console.log('Fetch error:', fetchError);
      
      if (fetchError) {
        console.error('Database fetch error:', fetchError);
        throw fetchError;
      }
      
      if (!existingApp) {
        console.error('Application not found in database');
        throw new Error('Заявка не найдена в базе данных');
      }
      
      console.log('Current application status:', existingApp.status);
      
      const { error } = await supabase
        .from(TABLES.APPLICATIONS)
        .update({
          status: 'withdrawn',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      console.log('Update error:', error);
      if (error) throw error;
      
      console.log('Application status updated successfully');

      // Track analytics
      analytics.track('application_withdrawn', {
        application_id: applicationId
      });
      
      console.log('=== WITHDRAW APPLICATION SERVICE END ===');
    } catch (error) {
      console.error('Failed to withdraw application:', error);
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