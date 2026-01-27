import { CollaborationForm } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';
import { chatService } from './chatService';

export class CollaborationService {
  async sendCollaborationRequest(requestData: Partial<CollaborationForm>): Promise<CollaborationForm> {
    throw new Error('Collaboration forms feature not implemented - use offers instead');
  }

  async respondToCollaborationRequest(
    requestId: string,
    response: 'accepted' | 'declined',
    responseData?: any
  ): Promise<CollaborationForm> {
    throw new Error('Collaboration forms feature not implemented - use offers instead');
  }

  async getCollaborationRequest(requestId: string): Promise<CollaborationForm | null> {
    return null;
  }

  async getUserCollaborationRequests(userId: string, type: 'sent' | 'received'): Promise<CollaborationForm[]> {
    return [];
  }

}

export const collaborationService = new CollaborationService();