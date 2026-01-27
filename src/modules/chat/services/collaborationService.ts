import { CollaborationForm } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';
import { chatService } from './chatService';
import { api } from '../../../core/api';

export class CollaborationService {
  async sendCollaborationRequest(requestData: Partial<CollaborationForm>): Promise<CollaborationForm> {
    try {
      // Validate collaboration form data
      this.validateCollaborationForm(requestData);

      const response = await api.post('/chat/collaboration-requests', {
        formFields: requestData.formFields,
        linkedCampaign: requestData.linkedCampaign,
        receiverId: requestData.receiverId
      });

      const transformedRequest = response.data;

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
      const apiResponse = await api.patch(`/chat/collaboration-requests/${requestId}/respond`, {
        response,
        responseData
      });

      const updatedRequest = apiResponse.data;

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
      const response = await api.get(`/chat/collaboration-requests/${requestId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Failed to get collaboration request:', error);
      throw error;
    }
  }

  async getUserCollaborationRequests(userId: string, type: 'sent' | 'received'): Promise<CollaborationForm[]> {
    try {
      const response = await api.get(`/chat/collaboration-requests?type=${type}`);
      return response.data;
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
}

export const collaborationService = new CollaborationService();