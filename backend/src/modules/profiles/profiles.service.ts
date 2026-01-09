import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateProfileDto, UpdateProfileDto } from './dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(createProfileDto: CreateProfileDto) {
    const supabase = this.supabaseService.getAdminClient();

    this.logger.log(`Creating profile for user: ${createProfileDto.userId}`);
    this.logger.debug(`Profile data: ${JSON.stringify({
      email: createProfileDto.email,
      username: createProfileDto.username,
      fullName: createProfileDto.fullName
    })}`);

    // Check if profile already exists by user_id
    const { data: existingProfileById, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', createProfileDto.userId)
      .maybeSingle();

    if (checkError) {
      this.logger.error(`Error checking existing profile: ${checkError.message}`, checkError);
    }

    // If profile exists, update it instead
    if (existingProfileById) {
      this.logger.log(`Profile already exists for user ${createProfileDto.userId}, updating instead`);
      return this.update(createProfileDto.userId, createProfileDto);
    }

    this.logger.log(`No existing profile found, creating new profile for user ${createProfileDto.userId}`);

    // Check if username is already taken by another user
    if (createProfileDto.username) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', createProfileDto.username)
        .neq('user_id', createProfileDto.userId)
        .maybeSingle();

      if (existingUser) {
        throw new ConflictException('Username already taken');
      }
    }

    // Check if email is already taken by another user
    if (createProfileDto.email) {
      const { data: existingEmailUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', createProfileDto.email)
        .neq('user_id', createProfileDto.userId)
        .maybeSingle();

      if (existingEmailUser) {
        throw new ConflictException('Email already in use by another user');
      }
    }

    const profileData: any = {
      user_id: createProfileDto.userId,
      email: createProfileDto.email || null,
      full_name: createProfileDto.fullName || null,
      username: createProfileDto.username || null,
      phone: createProfileDto.phone || null,
      avatar: createProfileDto.avatar || null,
      bio: createProfileDto.bio || null,
      location: createProfileDto.location || null,
      website: createProfileDto.website || null,
      user_type: createProfileDto.userType || null,
      social_media_links: createProfileDto.socialMediaLinks || {},
      influencer_data: createProfileDto.influencerData || null,
      advertiser_data: createProfileDto.advertiserData || null,
      metrics: createProfileDto.metrics || {},
      profile_completion: createProfileDto.profileCompletion || null,
      unified_account_info: {
        isVerified: false,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      },
    };

    this.logger.log(`Inserting new profile into database for user ${createProfileDto.userId}`);

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create profile for user ${createProfileDto.userId}: ${error.message}`, {
        error,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: createProfileDto.userId
      });

      // Check for specific constraint violations
      if (error.message.includes('unique') || error.code === '23505') {
        // This means profile already exists despite our check - race condition
        this.logger.warn(`Race condition detected: profile created between check and insert for user ${createProfileDto.userId}. Attempting update instead.`);

        // Try to update instead
        try {
          return await this.update(createProfileDto.userId, createProfileDto);
        } catch (updateError) {
          this.logger.error(`Failed to update profile after race condition: ${updateError.message}`);

          if (error.message.includes('email')) {
            throw new ConflictException('Email already in use');
          } else if (error.message.includes('username')) {
            throw new ConflictException('Username already taken');
          }
          throw new ConflictException('Profile with this information already exists');
        }
      }

      throw new ConflictException('Failed to create profile');
    }

    this.logger.log(`Successfully created profile for user ${createProfileDto.userId}`);
    return this.transformProfile(profile);
  }

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

    this.logger.log(`Updating profile for user: ${userId}`);
    this.logger.debug(`Update data: ${JSON.stringify({
      email: updateProfileDto.email,
      username: updateProfileDto.username,
      fullName: updateProfileDto.fullName
    })}`);

    // Check if username is being changed and if it's already taken
    if (updateProfileDto.username) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', updateProfileDto.username)
        .neq('user_id', userId)
        .maybeSingle();

      if (existingUser) {
        this.logger.warn(`Username ${updateProfileDto.username} is already taken by another user`);
        throw new ConflictException('Username already taken');
      }
    }

    // Check if email is being changed and if it's already taken
    if (updateProfileDto.email) {
      const { data: existingEmailUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', updateProfileDto.email)
        .neq('user_id', userId)
        .maybeSingle();

      if (existingEmailUser) {
        this.logger.warn(`Email ${updateProfileDto.email} is already taken by another user`);
        throw new ConflictException('Email already in use by another user');
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
    if (updateProfileDto.email !== undefined) {
      updateData.email = updateProfileDto.email;
    }
    if (updateProfileDto.avatar !== undefined) {
      updateData.avatar = updateProfileDto.avatar;
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
    if (updateProfileDto.userType !== undefined) {
      updateData.user_type = updateProfileDto.userType;
    }
    if (updateProfileDto.socialMediaLinks !== undefined) {
      updateData.social_media_links = updateProfileDto.socialMediaLinks;
    }
    if (updateProfileDto.influencerData !== undefined) {
      updateData.influencer_data = updateProfileDto.influencerData;
    }
    if (updateProfileDto.advertiserData !== undefined) {
      updateData.advertiser_data = updateProfileDto.advertiserData;
    }
    if (updateProfileDto.metrics !== undefined) {
      updateData.metrics = updateProfileDto.metrics;
    }
    if (updateProfileDto.profileCompletion !== undefined) {
      updateData.profile_completion = updateProfileDto.profileCompletion;
    }

    this.logger.log(`Executing update query for user ${userId}`);

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update profile for user ${userId}: ${error.message}`, {
        error,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId
      });

      // Check if profile doesn't exist
      if (error.code === 'PGRST116' || error.message.includes('no rows')) {
        this.logger.warn(`Profile not found for user ${userId}, cannot update`);
        throw new NotFoundException('Profile not found');
      }

      throw new ConflictException('Failed to update profile');
    }

    if (!updatedProfile) {
      this.logger.error(`Update returned no data for user ${userId}`);
      throw new NotFoundException('Profile not found');
    }

    this.logger.log(`Successfully updated profile for user ${userId}`);
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
      userId: profile.user_id,
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
      influencerData: profile.influencer_data || null,
      advertiserData: profile.advertiser_data || null,
      metrics: profile.metrics || {},
      profileCompletion: profile.profile_completion || null,
      unifiedAccountInfo: profile.unified_account_info || {},
      isDeleted: profile.is_deleted || false,
      deletedAt: profile.deleted_at || null,
      deletedBy: profile.deleted_by || null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }
}
