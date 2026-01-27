import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blacklist, UserProfile } from '../../database/entities';
import { CreateBlacklistDto } from './dto';

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(
    @InjectRepository(Blacklist)
    private blacklistRepository: Repository<Blacklist>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  async blockUser(userId: string, createDto: CreateBlacklistDto) {
    if (userId === createDto.blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const blockedUser = await this.userProfileRepository.findOne({
      where: { user_id: createDto.blockedId },
    });

    if (!blockedUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.blacklistRepository.findOne({
      where: {
        blocker_id: userId,
        blocked_user_id: createDto.blockedId,
      },
    });

    if (existing) {
      throw new ConflictException('User already blocked');
    }

    try {
      const blacklist = this.blacklistRepository.create({
        blocker_id: userId,
        blocked_user_id: createDto.blockedId,
        reason: createDto.reason,
      });

      const savedBlacklist = await this.blacklistRepository.save(blacklist);
      return this.transformBlacklist(savedBlacklist);
    } catch (error) {
      this.logger.error(`Failed to block user: ${error.message}`, error);
      throw new ConflictException('Failed to block user');
    }
  }

  async unblockUser(userId: string, blacklistId: string) {
    const blacklist = await this.blacklistRepository.findOne({
      where: { id: blacklistId },
    });

    if (!blacklist) {
      throw new NotFoundException('Blacklist entry not found');
    }

    if (blacklist.blocker_id !== userId) {
      throw new NotFoundException('Blacklist entry not found');
    }

    try {
      await this.blacklistRepository.delete({ id: blacklistId });
      return { message: 'User unblocked successfully' };
    } catch (error) {
      this.logger.error(`Failed to unblock user: ${error.message}`, error);
      throw new ConflictException('Failed to unblock user');
    }
  }

  async unblockUserByUserId(userId: string, blockedUserId: string) {
    const blacklist = await this.blacklistRepository.findOne({
      where: {
        blocker_id: userId,
        blocked_user_id: blockedUserId,
      },
    });

    if (!blacklist) {
      throw new NotFoundException('Blacklist entry not found');
    }

    return this.unblockUser(userId, blacklist.id);
  }

  async findAll(userId: string) {
    try {
      const blacklists = await this.blacklistRepository.find({
        where: { blocker_id: userId },
        relations: ['blocked_user'],
        order: { created_at: 'DESC' },
      });

      return blacklists.map((blacklist) => this.transformBlacklistWithUser(blacklist));
    } catch (error) {
      this.logger.error(`Failed to fetch blacklist: ${error.message}`, error);
      return [];
    }
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const count = await this.blacklistRepository.count({
      where: [
        { blocker_id: userId, blocked_user_id: targetUserId },
        { blocker_id: targetUserId, blocked_user_id: userId },
      ],
    });

    return count > 0;
  }

  private transformBlacklist(blacklist: Blacklist) {
    return {
      id: blacklist.id,
      blockerId: blacklist.blocker_id,
      blockedId: blacklist.blocked_user_id,
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
