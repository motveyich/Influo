import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateApplicationDto } from './dto';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createApplicationDto: CreateApplicationDto) {
    const supabase = this.supabaseService.getAdminClient();

    const tableName = createApplicationDto.cardType === 'influencer'
      ? 'influencer_cards'
      : 'advertiser_cards';

    const { data: card } = await supabase
      .from(tableName)
      .select('user_id')
      .eq('id', createApplicationDto.cardId)
      .maybeSingle();

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.user_id === userId) {
      throw new ConflictException('Cannot apply to your own card');
    }

    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .eq('card_id', createApplicationDto.cardId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('You have already applied to this card');
    }

    const applicationData = {
      user_id: userId,
      card_id: createApplicationDto.cardId,
      card_type: createApplicationDto.cardType,
      card_owner_id: card.user_id,
      message: createApplicationDto.message || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: application, error } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create application: ${error.message}`, error);
      throw new ConflictException('Failed to create application');
    }

    return this.transformApplication(application);
  }

  async findAll(userId: string, filters?: { status?: string; asOwner?: boolean }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('applications')
      .select('*, user_profiles!applications_user_id_fkey(*)');

    if (filters?.asOwner) {
      query = query.eq('card_owner_id', userId);
    } else {
      query = query.eq('user_id', userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: applications, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch applications: ${error.message}`, error);
      return [];
    }

    return applications.map((app) => this.transformApplication(app));
  }

  async accept(id: string, userId: string) {
    return this.updateStatus(id, userId, 'accepted');
  }

  async decline(id: string, userId: string) {
    return this.updateStatus(id, userId, 'declined');
  }

  private async updateStatus(id: string, userId: string, status: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: application } = await supabase
      .from('applications')
      .select('card_owner_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.card_owner_id !== userId) {
      throw new ForbiddenException('Only card owner can change application status');
    }

    if (application.status !== 'pending') {
      throw new ConflictException('Application already processed');
    }

    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ConflictException('Failed to update application');
    }

    return this.transformApplication(updated);
  }

  private transformApplication(application: any) {
    return {
      id: application.id,
      userId: application.user_id,
      cardId: application.card_id,
      cardType: application.card_type,
      cardOwnerId: application.card_owner_id,
      message: application.message,
      status: application.status,
      createdAt: application.created_at,
      updatedAt: application.updated_at,
      user: application.user_profiles ? {
        id: application.user_profiles.user_id,
        fullName: application.user_profiles.full_name,
        username: application.user_profiles.username,
        avatar: application.user_profiles.avatar,
      } : undefined,
    };
  }
}
