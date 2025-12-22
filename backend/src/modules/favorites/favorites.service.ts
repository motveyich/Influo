import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateFavoriteDto } from './dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private supabaseService: SupabaseService) {}

  async addFavorite(userId: string, createDto: CreateFavoriteDto) {
    const supabase = this.supabaseService.getAdminClient();

    const tableName = createDto.cardType === 'influencer' ? 'influencer_cards' : 'advertiser_cards';
    const { data: card } = await supabase.from(tableName).select('id').eq('id', createDto.cardId).maybeSingle();

    if (!card) {
      throw new NotFoundException(`${createDto.cardType} card not found`);
    }

    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('card_id', createDto.cardId)
      .eq('card_type', createDto.cardType)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Card already in favorites');
    }

    const favoriteData = {
      user_id: userId,
      card_id: createDto.cardId,
      card_type: createDto.cardType,
      created_at: new Date().toISOString(),
    };

    const { data: favorite, error } = await supabase.from('favorites').insert(favoriteData).select().single();

    if (error) {
      this.logger.error(`Failed to add favorite: ${error.message}`, error);
      throw new ConflictException('Failed to add favorite');
    }

    return this.transformFavorite(favorite);
  }

  async removeFavorite(userId: string, favoriteId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: favorite } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('id', favoriteId)
      .maybeSingle();

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    if (favorite.user_id !== userId) {
      throw new NotFoundException('Favorite not found');
    }

    const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);

    if (error) {
      this.logger.error(`Failed to remove favorite: ${error.message}`, error);
      throw new ConflictException('Failed to remove favorite');
    }

    return { message: 'Favorite removed successfully' };
  }

  async findAll(userId: string, filters?: { cardType?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase.from('favorites').select('*').eq('user_id', userId);

    if (filters?.cardType) {
      query = query.eq('card_type', filters.cardType);
    }

    const { data: favorites, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch favorites: ${error.message}`, error);
      return [];
    }

    const enrichedFavorites = await Promise.all(
      favorites.map(async (favorite) => {
        const tableName = favorite.card_type === 'influencer' ? 'influencer_cards' : 'advertiser_cards';
        const { data: card } = await supabase
          .from(tableName)
          .select('*, user:user_profiles!user_id(*)')
          .eq('id', favorite.card_id)
          .maybeSingle();

        return {
          ...this.transformFavorite(favorite),
          card: card ? this.transformCard(card) : null,
        };
      }),
    );

    return enrichedFavorites;
  }

  async isFavorite(userId: string, cardId: string, cardType: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .eq('card_type', cardType)
      .maybeSingle();

    return !!data;
  }

  async getStatistics(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: favorites } = await supabase.from('favorites').select('card_type').eq('user_id', userId);

    if (!favorites || favorites.length === 0) {
      return {
        total: 0,
        influencerCards: 0,
        advertiserCards: 0,
      };
    }

    const stats = favorites.reduce(
      (acc, f) => {
        acc.total++;
        if (f.card_type === 'influencer') {
          acc.influencerCards++;
        } else {
          acc.advertiserCards++;
        }
        return acc;
      },
      { total: 0, influencerCards: 0, advertiserCards: 0 },
    );

    return stats;
  }

  private transformFavorite(favorite: any) {
    return {
      id: favorite.id,
      userId: favorite.user_id,
      cardId: favorite.card_id,
      cardType: favorite.card_type,
      createdAt: favorite.created_at,
    };
  }

  private transformCard(card: any) {
    return {
      id: card.id,
      userId: card.user_id,
      platform: card.platform,
      title: card.title || card.campaign_title,
      description: card.description || card.campaign_description,
      user: card.user
        ? {
            id: card.user.user_id,
            fullName: card.user.full_name,
            username: card.user.username,
            avatar: card.user.avatar,
          }
        : undefined,
    };
  }
}
