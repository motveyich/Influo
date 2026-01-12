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

    // Check rate limiting
    const { data: isRateLimited, error: rateLimitError } = await supabase.rpc('is_rate_limited', {
      p_user_id: userId,
      p_target_user_id: card.user_id,
      p_interaction_type: 'application',
      p_card_id: createApplicationDto.cardId
    });

    if (rateLimitError) {
      this.logger.error(`Rate limit check failed: ${rateLimitError.message}`, rateLimitError);
    }

    if (isRateLimited) {
      throw new ConflictException('You have already applied to this card recently. Please try again later.');
    }

    // Convert cardType to target_type format (influencer -> influencer_card)
    const targetType = `${createApplicationDto.cardType}_card`;

    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('applicant_id', userId)
      .eq('target_reference_id', createApplicationDto.cardId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('You have already applied to this card');
    }

    const applicationData = {
      applicant_id: userId,
      target_id: card.user_id,
      target_type: targetType,
      target_reference_id: createApplicationDto.cardId,
      application_data: {
        message: createApplicationDto.message || '',
        proposedRate: createApplicationDto.proposedRate,
        timeline: createApplicationDto.timeline,
        deliverables: createApplicationDto.deliverables || [],
        additionalInfo: createApplicationDto.additionalInfo,
      },
      status: 'sent',
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

    // Record rate limit interaction
    await supabase.from('rate_limit_interactions').insert({
      user_id: userId,
      target_user_id: card.user_id,
      interaction_type: 'application',
      card_id: createApplicationDto.cardId,
    });

    return this.transformApplication(application);
  }

  async findAll(userId: string, filters?: { status?: string; asOwner?: boolean }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('applications')
      .select('*, user_profiles!applications_applicant_id_fkey(*)');

    if (filters?.asOwner !== undefined) {
      if (filters.asOwner) {
        query = query.eq('target_id', userId);
      } else {
        query = query.eq('applicant_id', userId);
      }
    } else {
      query = query.or(`applicant_id.eq.${userId},target_id.eq.${userId}`);
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
    return this.updateStatus(id, userId, 'accepted', true);
  }

  async decline(id: string, userId: string) {
    return this.updateStatus(id, userId, 'declined', true);
  }

  async markInProgress(id: string, userId: string) {
    return this.updateStatus(id, userId, 'in_progress', false);
  }

  async complete(id: string, userId: string) {
    return this.updateStatus(id, userId, 'completed', false);
  }

  async terminate(id: string, userId: string) {
    return this.updateStatus(id, userId, 'cancelled', false);
  }

  async cancel(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: application } = await supabase
      .from('applications')
      .select('applicant_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.applicant_id !== userId) {
      throw new ForbiddenException('Only applicant can cancel application');
    }

    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ConflictException('Failed to cancel application');
    }

    return this.transformApplication(updated);
  }

  private async updateStatus(id: string, userId: string, status: string, requirePending = false) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: application } = await supabase
      .from('applications')
      .select('applicant_id, target_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const isParticipant = application.target_id === userId || application.applicant_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Not authorized to update this application');
    }

    if (requirePending && application.status !== 'sent') {
      throw new ConflictException('Application already processed');
    }

    if (status === 'accepted' || status === 'declined') {
      if (application.target_id !== userId) {
        throw new ForbiddenException('Only card owner can accept or decline');
      }
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
      applicantId: application.applicant_id,
      targetId: application.target_id,
      targetType: application.target_type || '',
      targetReferenceId: application.target_reference_id,
      applicationData: application.application_data || {},
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
