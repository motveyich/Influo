import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateBlacklistDto } from './dto';

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(private supabaseService: SupabaseService) {}

  async blockUser(userId: string, createDto: CreateBlacklistDto) {
    const supabase = this.supabaseService.getAdminClient();

    if (userId === createDto.blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const { data: blockedUser } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', createDto.blockedId)
      .maybeSingle();

    if (!blockedUser) {
      throw new NotFoundException('User not found');
    }

    const { data: existing } = await supabase
      .from('blacklist')
      .select('id')
      .eq('blocker_id', userId)
      .eq('blocked_id', createDto.blockedId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('User already blocked');
    }

    const blacklistData = {
      blocker_id: userId,
      blocked_id: createDto.blockedId,
      reason: createDto.reason,
      created_at: new Date().toISOString(),
    };

    const { data: blacklist, error } = await supabase.from('blacklist').insert(blacklistData).select().single();

    if (error) {
      this.logger.error(`Failed to block user: ${error.message}`, error);
      throw new ConflictException('Failed to block user');
    }

    return this.transformBlacklist(blacklist);
  }

  async unblockUser(userId: string, blacklistId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: blacklist } = await supabase
      .from('blacklist')
      .select('blocker_id')
      .eq('id', blacklistId)
      .maybeSingle();

    if (!blacklist) {
      throw new NotFoundException('Blacklist entry not found');
    }

    if (blacklist.blocker_id !== userId) {
      throw new NotFoundException('Blacklist entry not found');
    }

    const { error } = await supabase.from('blacklist').delete().eq('id', blacklistId);

    if (error) {
      this.logger.error(`Failed to unblock user: ${error.message}`, error);
      throw new ConflictException('Failed to unblock user');
    }

    return { message: 'User unblocked successfully' };
  }

  async findAll(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: blacklists, error } = await supabase
      .from('blacklist')
      .select(`
        *,
        blocked_user:user_profiles!blacklist_blocked_id_fkey(*)
      `)
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch blacklist: ${error.message}`, error);
      return [];
    }

    return blacklists.map((blacklist) => this.transformBlacklistWithUser(blacklist));
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .rpc('is_user_blacklisted', {
        p_user_id: userId,
        p_target_user_id: targetUserId,
      })
      .single();

    return Boolean(data) || false;
  }

  private transformBlacklist(blacklist: any) {
    return {
      id: blacklist.id,
      blockerId: blacklist.blocker_id,
      blockedId: blacklist.blocked_id,
      reason: blacklist.reason,
      createdAt: blacklist.created_at,
    };
  }

  private transformBlacklistWithUser(blacklist: any) {
    return {
      ...this.transformBlacklist(blacklist),
      blockedUser: blacklist.blocked_user
        ? {
            id: blacklist.blocked_user.user_id,
            fullName: blacklist.blocked_user.full_name,
            username: blacklist.blocked_user.username,
            avatar: blacklist.blocked_user.avatar,
          }
        : undefined,
    };
  }
}
