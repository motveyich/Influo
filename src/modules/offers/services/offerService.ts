import { supabase, TABLES } from '../../../core/supabase';
import { Offer } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';
import { chatService } from '../../chat/services/chatService';

export class OfferService {
  private retryAttempts = 3;
  private retryDelay = 1000;

  async createOffer(offerData: Partial<Offer>): Promise<Offer> {
    try {
      // Prevent creating offers to self
      if (offerData.influencerId === offerData.advertiserId) {
        throw new Error('Cannot create offer to yourself');
      }
      
      // Validate offer data
      this.validateOfferData(offerData);

      const newOffer = {
        influencer_id: offerData.influencerId,
        campaign_id: offerData.campaignId,
        advertiser_id: offerData.advertiserId,
        details: offerData.details,
        status: 'pending',
        timeline: {
          createdAt: new Date().toISOString(),
          respondedAt: null,
          completedAt: null
        },
        messages: [],
        metadata: {
          viewCount: 0,
          lastViewed: null
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.OFFERS)
        .insert([newOffer])
        .select()
        .single();

      if (error) throw error;

      const transformedOffer = this.transformFromDatabase(data);

      // Send offer as chat message
      await this.sendOfferNotification(transformedOffer, 'new_offer');

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'offer_received',
        data: transformedOffer,
        userId: offerData.influencerId!,
        timestamp: transformedOffer.timeline.createdAt
      });

      // Track analytics
      analytics.trackOfferSent(
        transformedOffer.offerId,
        transformedOffer.influencerId,
        transformedOffer.campaignId
      );

      return transformedOffer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async respondToOffer(
    offerId: string, 
    response: 'accepted' | 'declined' | 'counter',
    responseData?: any
  ): Promise<Offer> {
    let attempt = 0;
    
    while (attempt < this.retryAttempts) {
      try {
        const updateData: any = {
          status: response,
          timeline: {
            respondedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        };

        if (responseData) {
          updateData.details = responseData;
        }

        if (response === 'completed') {
          updateData.timeline.completedAt = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from(TABLES.OFFERS)
          .update(updateData)
          .eq('offer_id', offerId)
          .select()
          .single();

        if (error) throw error;

        const updatedOffer = this.transformFromDatabase(data);

        // Send response notification
        await this.sendOfferNotification(updatedOffer, 'offer_response');

        // Send real-time notification to advertiser
        realtimeService.sendNotification({
          type: 'offer_response',
          data: { ...updatedOffer, response },
          userId: updatedOffer.advertiserId,
          timestamp: updatedOffer.timeline.respondedAt!
        });

        // Track analytics
        analytics.track('offer_responded', {
          offer_id: offerId,
          response: response,
          influencer_id: updatedOffer.influencerId
        });

        return updatedOffer;
      } catch (error) {
        attempt++;
        console.error(`Attempt ${attempt} failed to respond to offer:`, error);
        
        if (attempt >= this.retryAttempts) {
          // Notify user of failure
          await this.notifyResponseFailure(offerId, response);
          throw new Error('Failed to save response after multiple attempts. Please try again.');
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  async withdrawOffer(offerId: string): Promise<Offer> {
    try {
      console.log('=== OFFER SERVICE: WITHDRAW START ===');
      console.log('Withdrawing offer ID:', offerId);
      
      // First, fetch the offer to verify its existence and status
      const { data: existingOffer, error: fetchError } = await supabase
        .from(TABLES.OFFERS)
        .select('*')
        .eq('offer_id', offerId)
        .maybeSingle();

      console.log('Found offer in DB:', existingOffer);
      console.log('Current status in DB:', existingOffer?.status);
      console.log('Fetch error:', fetchError);

      if (fetchError) throw fetchError;
      
      if (!existingOffer) {
        throw new Error('Предложение не найдено');
      }

      if (existingOffer.status !== 'pending') {
        throw new Error(`Нельзя отозвать предложение со статусом "${existingOffer.status}"`);
      }

      console.log('Updating offer status from', existingOffer.status, 'to withdrawn');

      const { data, error } = await supabase
        .from(TABLES.OFFERS)
        .update({
          status: 'withdrawn',
          timeline: {
            ...existingOffer.timeline,
            withdrawnAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', offerId)
        .select()
        .single();

      console.log('Database update error:', error);
      if (error) throw error;

      console.log('Updated offer data:', data);
      console.log('New status after update:', data?.status);

      const withdrawnOffer = this.transformFromDatabase(data);

      // Notify influencer of withdrawal
      await this.sendOfferNotification(withdrawnOffer, 'offer_withdrawn');

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'offer_withdrawn',
        data: withdrawnOffer,
        userId: withdrawnOffer.influencerId,
        timestamp: new Date().toISOString()
      });

      // Track analytics
      analytics.track('offer_withdrawn', {
        offer_id: offerId,
        advertiser_id: withdrawnOffer.advertiserId
      });

      console.log('=== OFFER SERVICE: WITHDRAW END ===');
      return withdrawnOffer;
    } catch (error) {
      console.error('Failed to withdraw offer:', error);
      throw error;
    }
  }

  async getOffer(offerId: string): Promise<Offer | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.OFFERS)
        .select('*')
        .eq('offer_id', offerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get offer:', error);
      throw error;
    }
  }

  async getUserOffers(userId: string, type: 'sent' | 'received'): Promise<Offer[]> {
    try {
      const column = type === 'sent' ? 'advertiser_id' : 'influencer_id';
      
      const { data, error } = await supabase
        .from(TABLES.OFFERS)
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(offer => this.transformFromDatabase(offer));
    } catch (error) {
      console.error('Failed to get user offers:', error);
      throw error;
    }
  }

  async markOfferAsViewed(offerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.OFFERS)
        .update({
          metadata: {
            viewCount: supabase.raw('metadata->\'viewCount\'::int + 1'),
            lastViewed: new Date().toISOString()
          }
        })
        .eq('offer_id', offerId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark offer as viewed:', error);
    }
  }

  async requestMoreInfo(offerId: string, message: string): Promise<Offer> {
    try {
      const offer = await this.getOffer(offerId);
      if (!offer) throw new Error('Offer not found');

      // Send message requesting more info
      await chatService.sendMessage({
        senderId: offer.influencerId,
        receiverId: offer.advertiserId,
        messageContent: `Request for more information about offer ${offerId}: ${message}`,
        messageType: 'offer',
        metadata: {
          offerId: offerId,
          requestType: 'more_info'
        }
      });

      // Update offer status
      const { data, error } = await supabase
        .from(TABLES.OFFERS)
        .update({
          status: 'info_requested',
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', offerId)
        .select()
        .single();

      if (error) throw error;

      const updatedOffer = this.transformFromDatabase(data);

      // Send real-time notification
      realtimeService.sendNotification({
        type: 'offer_info_requested',
        data: { ...updatedOffer, message },
        userId: offer.advertiserId,
        timestamp: new Date().toISOString()
      });

      // Track analytics
      analytics.track('offer_info_requested', {
        offer_id: offerId,
        influencer_id: offer.influencerId
      });

      return updatedOffer;
    } catch (error) {
      console.error('Failed to request more info:', error);
      throw error;
    }
  }

  private async sendOfferNotification(offer: Offer, type: string): Promise<void> {
    try {
      let messageContent = '';
      let receiverId = '';

      switch (type) {
        case 'new_offer':
          messageContent = `New collaboration offer received for campaign. Rate: $${offer.details.rate}`;
          receiverId = offer.influencerId;
          break;
        case 'offer_response':
          messageContent = `Offer response: ${offer.status}`;
          receiverId = offer.advertiserId;
          break;
        case 'offer_withdrawn':
          messageContent = `Offer has been withdrawn by the advertiser`;
          receiverId = offer.influencerId;
          break;
      }

      if (messageContent && receiverId) {
        await chatService.sendMessage({
          senderId: type === 'offer_withdrawn' ? offer.advertiserId : (type === 'new_offer' ? offer.advertiserId : offer.influencerId),
          receiverId: receiverId,
          messageContent: messageContent,
          messageType: 'offer',
          metadata: {
            offerId: offer.offerId,
            campaignId: offer.campaignId
          }
        });
      }
    } catch (error) {
      console.error('Failed to send offer notification:', error);
      // Don't throw - this is a fallback notification
    }
  }

  private async notifyResponseFailure(offerId: string, response: string): Promise<void> {
    try {
      const offer = await this.getOffer(offerId);
      if (!offer) return;

      await chatService.sendMessage({
        senderId: 'system',
        receiverId: offer.influencerId,
        messageContent: `Failed to save your ${response} response to offer ${offerId}. Please try again.`,
        messageType: 'text',
        metadata: {
          offerId: offerId,
          errorType: 'response_failure'
        }
      });
    } catch (error) {
      console.error('Failed to notify response failure:', error);
    }
  }

  private validateOfferData(offerData: Partial<Offer>): void {
    const errors: string[] = [];

    if (!offerData.influencerId) errors.push('Influencer ID is required');
    if (!offerData.campaignId) errors.push('Campaign ID is required');
    if (!offerData.advertiserId) errors.push('Advertiser ID is required');
    if (offerData.influencerId === offerData.advertiserId) errors.push('Cannot create offer to yourself');
    
    if (!offerData.details) {
      errors.push('Offer details are required');
    } else {
      if (!offerData.details.rate || offerData.details.rate <= 0) {
        errors.push('Valid rate is required');
      }
      if (!offerData.details.deliverables || offerData.details.deliverables.length === 0) {
        errors.push('At least one deliverable is required');
      }
      if (!offerData.details.timeline?.trim()) {
        errors.push('Timeline is required');
      }
      if (!offerData.details.terms?.trim()) {
        errors.push('Terms are required');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): Offer {
    return {
      offerId: dbData.offer_id,
      influencerId: dbData.influencer_id,
      campaignId: dbData.campaign_id,
      advertiserId: dbData.advertiser_id,
      details: dbData.details,
      status: dbData.status,
      timeline: dbData.timeline,
      messages: dbData.messages || [],
      metadata: dbData.metadata || { viewCount: 0 }
    };
  }
}

export const offerService = new OfferService();