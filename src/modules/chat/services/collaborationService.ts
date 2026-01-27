import { supabase, TABLES } from '../../../core/supabase';
import { CollaborationForm } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';
import { chatService } from './chatService';

export class CollaborationService {
  async sendCollaborationRequest(requestData: Partial<CollaborationForm>): Promise<CollaborationForm> {
    try {
      // Validate collaboration form data
      this.validateCollaborationForm(requestData);

      const newRequest: Partial<CollaborationForm> = {
        form_fields: requestData.formFields,
        linked_campaign: requestData.linkedCampaign,
        sender_id: requestData.senderId,
        receiver_id: requestData.receiverId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_FORMS)
        .insert([newRequest])
        .select()
        .single();

      if (error) throw error;

      const transformedRequest = this.transformFromDatabase(data);

      // Send as chat message
      await chatService.sendMessage({
        senderId: requestData.senderId,
        receiverId: requestData.receiverId,
        messageContent: `Collaboration request sent for campaign: ${requestData.formFields?.campaignTitle || 'Untitled'}`,
        messageType: 'offer',
        metadata: {
          collaborationFormId: transformedRequest.id,
          campaignId: requestData.linkedCampaign
        }
      });

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'collaboration_request',
        data: transformedRequest,
        userId: requestData.receiverId!,
        timestamp: transformedRequest.createdAt
      });

      // Track analytics
      analytics.track('collaboration_request_sent', {
        sender_id: requestData.senderId,
        receiver_id: requestData.receiverId,
        campaign_id: requestData.linkedCampaign
      });

      return transformedRequest;
    } catch (error) {
      console.error('Failed to send collaboration request:', error);
      throw error;
    }
  }

  async respondToCollaborationRequest(
    requestId: string, 
    response: 'accepted' | 'declined',
    responseData?: any
  ): Promise<CollaborationForm> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_FORMS)
        .update({
          status: response,
          form_fields: responseData ? { ...responseData } : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      const updatedRequest = this.transformFromDatabase(data);

      // Send response as chat message
      await chatService.sendMessage({
        senderId: updatedRequest.receiverId,
        receiverId: updatedRequest.senderId,
        messageContent: `Collaboration request ${response}`,
        messageType: 'offer',
        metadata: {
          collaborationFormId: requestId,
          response: response,
          responseData: responseData
        }
      });

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'collaboration_response',
        data: { ...updatedRequest, response },
        userId: updatedRequest.senderId,
        timestamp: updatedRequest.updatedAt
      });

      // Track analytics
      analytics.track('collaboration_request_responded', {
        request_id: requestId,
        response: response,
        responder_id: updatedRequest.receiverId
      });

      return updatedRequest;
    } catch (error) {
      console.error('Failed to respond to collaboration request:', error);
      throw error;
    }
  }

  async getCollaborationRequest(requestId: string): Promise<CollaborationForm | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_FORMS)
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get collaboration request:', error);
      throw error;
    }
  }

  async getUserCollaborationRequests(userId: string, type: 'sent' | 'received'): Promise<CollaborationForm[]> {
    try {
      const column = type === 'sent' ? 'sender_id' : 'receiver_id';
      
      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_FORMS)
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(request => this.transformFromDatabase(request));
    } catch (error) {
      console.error('Failed to get user collaboration requests:', error);
      throw error;
    }
  }

  private validateCollaborationForm(formData: Partial<CollaborationForm>): void {
    const errors: string[] = [];

    if (!formData.senderId) errors.push('Sender ID is required');
    if (!formData.receiverId) errors.push('Receiver ID is required');
    if (!formData.linkedCampaign) errors.push('Linked campaign is required');
    
    if (!formData.formFields) {
      errors.push('Form fields are required');
    } else {
      // Validate required form fields
      const fields = formData.formFields;
      
      if (!fields.campaignTitle?.trim()) {
        errors.push('Campaign title is required');
      }
      
      if (!fields.message?.trim()) {
        errors.push('Message is required');
      } else if (fields.message.length < 10) {
        errors.push('Message must be at least 10 characters long');
      }
      
      if (!fields.proposedRate || fields.proposedRate <= 0) {
        errors.push('Valid proposed rate is required');
      }
      
      if (!fields.deliverables || fields.deliverables.length === 0) {
        errors.push('At least one deliverable is required');
      }
      
      if (!fields.timeline?.trim()) {
        errors.push('Timeline is required');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): CollaborationForm {
    return {
      id: dbData.id,
      formFields: dbData.form_fields,
      linkedCampaign: dbData.linked_campaign,
      senderId: dbData.sender_id,
      receiverId: dbData.receiver_id,
      status: dbData.status,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const collaborationService = new CollaborationService();