import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

@Injectable()
export class CardAnalyticsService {
  constructor(private supabase: SupabaseService) {}

  async trackCardView(cardId: string, cardType: string, viewerId?: string) {
    const { data: existing, error: checkError } = await this.supabase.getClient()
      .from('card_analytics')
      .select('*')
      .eq('card_id', cardId)
      .eq('card_type', cardType)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      const { error } = await this.supabase.getClient()
        .from('card_analytics')
        .update({
          views_count: (existing.views_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { data: ownerData } = await this.supabase.getClient()
        .from(cardType)
        .select('user_id')
        .eq('id', cardId)
        .single();

      const { error } = await this.supabase.getClient()
        .from('card_analytics')
        .insert({
          card_id: cardId,
          card_type: cardType,
          owner_id: ownerData?.user_id,
          views_count: 1,
          last_viewed_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    return { success: true };
  }

  async getCardAnalytics(cardId: string, cardType: string) {
    const { data, error } = await this.supabase.getClient()
      .from('card_analytics')
      .select('*')
      .eq('card_id', cardId)
      .eq('card_type', cardType)
      .maybeSingle();

    if (error) throw error;
    return data || {
      card_id: cardId,
      card_type: cardType,
      views_count: 0,
      clicks_count: 0,
      applications_count: 0,
    };
  }

  async getUserCardAnalytics(userId: string) {
    const { data, error } = await this.supabase.getClient()
      .from('card_analytics')
      .select('*')
      .eq('owner_id', userId);

    if (error) throw error;
    return data || [];
  }
}
