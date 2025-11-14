import { supabase, TABLES } from '../../../core/supabase';
import { isSupabaseConfigured } from '../../../core/supabase';
import { Application } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';
import { chatService } from '../../chat/services/chatService';
import { emailNotificationService } from '../../../services/emailNotificationService';

export class ApplicationService {
  async createApplication(applicationData: Partial<Application>): Promise<Application> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase не настроен. Пожалуйста, нажмите "Connect to Supabase" в правом верхнем углу.');
      }

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
        application_data: {
          ...applicationData.applicationData,
          status: 'sent'
        },
        status: 'sent',
        timeline: {
          pendingAt: new Date().toISOString()
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

      // Create offer automatically after successful application
      try {
        const { offerService } = await import('../../offers/services/offerService');
        
        // Determine roles based on application
        const isInfluencerApplication = applicationData.targetType === 'campaign' || 
                                      applicationData.targetType === 'advertiser_card';
        
        let influencerId, advertiserId;
        if (isInfluencerApplication) {
          influencerId = applicationData.applicantId;
          advertiserId = applicationData.targetId;
        } else {
          // Advertiser applying to influencer
          advertiserId = applicationData.applicantId;
          influencerId = applicationData.targetId;
        }
        
        // Create offer from application
        await offerService.createOfferFromApplication({
          influencerId: influencerId!,
          advertiserId: advertiserId!,
          applicationId: transformedApplication.id,
          title: applicationData.applicationData?.message?.substring(0, 50) + '...' || 'Предложение о сотрудничестве',
          description: applicationData.applicationData?.message || 'Предложение создано из заявки',
          proposedRate: applicationData.applicationData?.proposedRate || 1000,
          currency: 'USD',
          deliverables: applicationData.applicationData?.deliverables || ['Услуги по договоренности'],
          timeline: applicationData.applicationData?.timeline || 'По договоренности',
          metadata: {
            createdFromApplication: true,
            originalApplicationId: transformedApplication.id
          }
        });
      } catch (offerError) {
        console.error('Failed to create offer from application:', offerError);
        // Don't fail the entire application if offer creation fails
      }

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'application_received',
        data: transformedApplication,
        userId: applicationData.targetId!,
        timestamp: transformedApplication.timeline.pendingAt
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
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase не настроен. Пожалуйста, нажмите "Connect to Supabase" в правом верхнем углу.');
      }

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
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, returning empty applications list');
        return [];
      }

      const column = type === 'sent' ? 'applicant_id' : 'target_id';
      
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq(column, userId)
        .not('status', 'in', '(cancelled,withdrawn)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data) return [];

      return data.map(app => this.transformFromDatabase(app));
    } catch (error) {
      // Handle specific Supabase errors
      if (error.code === '42P01') {
        console.warn('Applications table does not exist, returning empty list');
        return [];
      }
      console.error('Failed to get user applications:', error);
      return [];
    }
  }

  async getApplication(applicationId: string): Promise<Application | null> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase не настроен. Пожалуйста, нажмите "Connect to Supabase" в правом верхнем углу.');
      }

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
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, skipping application view tracking');
        return;
      }

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

      // Send email notification
      try {
        let campaignName = 'вашей карточке';
        if (application.targetType === 'campaign') {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('title')
            .eq('id', application.targetReferenceId)
            .maybeSingle();
          campaignName = campaign?.title || 'кампании';
        }

        await emailNotificationService.sendNewApplicationNotification(
          application.targetId,
          campaignName,
          `Новая заявка от ${applicantName}`
        );
      } catch (error) {
        console.error('Failed to send application notification email:', error);
      }
    } catch (error) {
      console.error('Failed to send application notification:', error);
      throw error;
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
      throw error;
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

  async cancelApplication(applicationId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase не настроен. Пожалуйста, нажмите "Connect to Supabase" в правом верхнем углу.');
      }

      // First check if application exists and is cancellable
      const { data: existingApp, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!existingApp) {
        throw new Error('Заявка не найдена в базе данных');
      }
      
      if (existingApp.status === 'cancelled') {
        throw new Error('Заявка уже была отменена');
      }
      
      if (!['pending'].includes(existingApp.status)) {
        throw new Error('Нельзя отменить заявку со статусом: ' + existingApp.status);
      }
      
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Track analytics
      analytics.track('application_cancelled', {
        application_id: applicationId
      });
    } catch (error) {
      console.error('Failed to cancel application:', error);
      throw error;
    }
  }

  private async sendCompletionNotification(application: Application, completedBy: string): Promise<void> {
    try {
      // Get completer's profile to show proper name
      const { data: completerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', completedBy)
        .single();

      const completerName = completerProfile?.full_name || 'Партнер';
      const messageContent = `✅ Сотрудничество завершено! ${completerName} отметил работу как выполненную. Теперь вы можете оставить отзыв.`;
      
      const receiverId = completedBy === application.applicantId 
        ? application.targetId 
        : application.applicantId;
      
      await chatService.sendMessage({
        senderId: completedBy,
        receiverId: receiverId,
        messageContent: messageContent,
        messageType: 'offer',
        metadata: {
          applicationId: application.id,
          actionType: 'application_completed',
          completedBy: completedBy
        }
      });
    } catch (error) {
      console.error('Failed to send completion notification:', error);
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