import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { UpdateProfileDto } from './dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private supabaseService: SupabaseService) {}

  async findOne(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch profile: ${error.message}`, error);
      throw new NotFoundException('Profile not found');
    }

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.transformProfile(profile);
  }

  async update(userId: string, updateProfileDto: UpdateProfileDto) {
    const supabase = this.supabaseService.getAdminClient();

    if (updateProfileDto.username) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', updateProfileDto.username)
        .neq('user_id', userId)
        .maybeSingle();

      if (existingUser) {
        throw new ConflictException('Username already taken');
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateProfileDto.fullName !== undefined) {
      updateData.full_name = updateProfileDto.fullName;
    }
    if (updateProfileDto.username !== undefined) {
      updateData.username = updateProfileDto.username;
    }
    if (updateProfileDto.phone !== undefined) {
      updateData.phone = updateProfileDto.phone;
    }
    if (updateProfileDto.bio !== undefined) {
      updateData.bio = updateProfileDto.bio;
    }
    if (updateProfileDto.location !== undefined) {
      updateData.location = updateProfileDto.location;
    }
    if (updateProfileDto.website !== undefined) {
      updateData.website = updateProfileDto.website;
    }
    if (updateProfileDto.socialMediaLinks !== undefined) {
      updateData.social_media_links = updateProfileDto.socialMediaLinks;
    }
    if (updateProfileDto.metrics !== undefined) {
      updateData.metrics = updateProfileDto.metrics;
    }

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update profile: ${error.message}`, error);
      throw new ConflictException('Failed to update profile');
    }

    return this.transformProfile(updatedProfile);
  }

  async delete(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to delete profile: ${error.message}`, error);
      throw new ConflictException('Failed to delete profile');
    }

    return { message: 'Profile deleted successfully' };
  }

  async getProfileCompletion(userId: string) {
    const profile = await this.findOne(userId);

    const requiredFields: (keyof typeof profile)[] = [
      'fullName',
      'username',
      'phone',
      'bio',
      'location',
      'avatar',
    ];

    const completedFields = requiredFields.filter(
      (field) => profile[field] && profile[field] !== '',
    );

    const percentage = Math.round(
      (completedFields.length / requiredFields.length) * 100,
    );

    return {
      percentage,
      completedFields: completedFields.length,
      totalFields: requiredFields.length,
      missingFields: requiredFields.filter(
        (field) => !profile[field] || profile[field] === '',
      ),
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const supabase = this.supabaseService.getAdminClient();

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      this.logger.error(`Failed to upload avatar: ${uploadError.message}`, uploadError);
      throw new ConflictException('Failed to upload avatar');
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar: avatarUrl })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Failed to update profile with avatar: ${updateError.message}`, updateError);
      throw new ConflictException('Failed to update profile with avatar');
    }

    return this.transformProfile(updatedProfile);
  }

  async searchProfiles(query: string, userType?: string, limit = 20) {
    const supabase = this.supabaseService.getAdminClient();

    let queryBuilder = supabase
      .from('user_profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (userType) {
      queryBuilder = queryBuilder.eq('user_type', userType);
    }

    const { data: profiles, error } = await queryBuilder;

    if (error) {
      this.logger.error(`Failed to search profiles: ${error.message}`, error);
      return [];
    }

    return profiles.map((profile) => this.transformProfile(profile));
  }

  private transformProfile(profile: any) {
    return {
      id: profile.user_id,
      email: profile.email,
      fullName: profile.full_name,
      username: profile.username,
      phone: profile.phone,
      avatar: profile.avatar,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      userType: profile.user_type,
      socialMediaLinks: profile.social_media_links || {},
      metrics: profile.metrics || {},
      unifiedAccountInfo: profile.unified_account_info || {},
      isDeleted: profile.is_deleted || false,
      deletedAt: profile.deleted_at || null,
      deletedBy: profile.deleted_by || null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }
}
