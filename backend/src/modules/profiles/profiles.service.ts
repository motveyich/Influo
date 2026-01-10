import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateProfileDto, UpdateProfileDto } from './dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(createProfileDto: CreateProfileDto) {
    const supabase = this.supabaseService.getAdminClient();

    if (!createProfileDto.userId) {
      throw new ConflictException('User ID is required to create a profile');
    }

    this.logger.log(`Creating profile for user: ${createProfileDto.userId}`);
    this.logger.debug(`Profile data: ${JSON.stringify({
      email: createProfileDto.email,
      username: createProfileDto.username,
      fullName: createProfileDto.fullName
    })}`);

    // Check if profile already exists by user_id (including deleted profiles)
    const { data: existingProfileById, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', createProfileDto.userId)
      .maybeSingle();

    if (checkError) {
      this.logger.error(`Error checking existing profile: ${checkError.message}`, checkError);
    }

    // If profile exists and is deleted, restore it
    if (existingProfileById && existingProfileById.is_deleted) {
      this.logger.log(`Profile exists but is deleted for user ${createProfileDto.userId}, restoring it`);
      const restoreData: any = {
        email: createProfileDto.email || existingProfileById.email,
        full_name: createProfileDto.fullName || existingProfileById.full_name,
        username: createProfileDto.username || existingProfileById.username,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
        unified_account_info: {
          ...existingProfileById.unified_account_info,
          lastActive: new Date().toISOString(),
        },
      };

      const { data: restoredProfile, error: restoreError } = await supabase
        .from('user_profiles')
        .update(restoreData)
        .eq('user_id', createProfileDto.userId)
        .select()
        .single();

      if (restoreError) {
        this.logger.error(`Failed to restore profile: ${restoreError.message}`, restoreError);
        throw new ConflictException('Failed to restore profile');
      }

      this.logger.log(`Successfully restored profile for user ${createProfileDto.userId}`);
      return this.transformProfile(restoredProfile);
    }

    // If profile exists and is not deleted, update it instead
    if (existingProfileById) {
      this.logger.log(`Profile already exists for user ${createProfileDto.userId}, updating instead`);
      return this.update(createProfileDto.userId, createProfileDto);
    }

    this.logger.log(`No existing profile found, creating new profile for user ${createProfileDto.userId}`);

    // Check if username is already taken by another active user
    if (createProfileDto.username) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', createProfileDto.username)
        .eq('is_deleted', false)
        .neq('user_id', createProfileDto.userId)
        .maybeSingle();

      if (existingUser) {
        throw new ConflictException('Username already taken');
      }
    }

    // Check if email is already taken by another active user
    if (createProfileDto.email) {
      const { data: existingEmailUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', createProfileDto.email)
        .eq('is_deleted', false)
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

        // Determine which field caused the conflict
        let conflictField = 'unknown';
        if (error.message.includes('email') || error.details?.includes('email')) {
          conflictField = 'email';
        } else if (error.message.includes('username') || error.details?.includes('username')) {
          conflictField = 'username';
        } else if (error.message.includes('user_id') || error.details?.includes('user_id')) {
          conflictField = 'user_id';
        }

        this.logger.log(`Conflict field detected: ${conflictField}`);

        // If conflict is on user_id, try to update the existing profile
        if (conflictField === 'user_id' && createProfileDto.userId) {
          try {
            this.logger.log(`Attempting to update existing profile for user ${createProfileDto.userId}`);
            // Convert CreateProfileDto to UpdateProfileDto (exclude userId field)
            const { userId, ...updateDto } = createProfileDto;
            return await this.update(userId, updateDto);
          } catch (updateError: any) {
            this.logger.error(`Failed to update profile after race condition: ${updateError.message}`);
            throw new ConflictException('Profile already exists and could not be updated');
          }
        } else if (conflictField === 'email') {
          throw new ConflictException('Email already in use by another user');
        } else if (conflictField === 'username') {
          throw new ConflictException('Username already taken');
        }

        throw new ConflictException('Profile with this information already exists');
      }

      // Log the error with full details for debugging
      this.logger.error('Unexpected error creating profile', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        userId: createProfileDto.userId
      });

      throw new InternalServerErrorException('Failed to create profile. Please try again or contact support.');
    }

    this.logger.log(`Successfully created profile for user ${createProfileDto.userId}`);
    return this.transformProfile(profile);
  }

  async findOne(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    this.logger.log(`Fetching profile for user: ${userId}`);

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch profile for user ${userId}: ${error.message}`, error);
      throw new NotFoundException('Profile not found');
    }

    if (!profile) {
      this.logger.warn(`Profile not found or deleted for user ${userId}`);
      throw new NotFoundException('Profile not found');
    }

    this.logger.log(`Successfully fetched profile for user ${userId}`);
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

    // Get current profile to check if email/username actually changed
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('email, username')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchError) {
      this.logger.error(`Failed to fetch current profile: ${fetchError.message}`, fetchError);
      throw new NotFoundException('Profile not found');
    }

    if (!currentProfile) {
      this.logger.error(`Profile not found for user ${userId}`);
      throw new NotFoundException('Profile not found');
    }

    // Check if email is being changed and if it's already taken by another active user
    if (updateProfileDto.email && updateProfileDto.email !== currentProfile.email) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', updateProfileDto.email)
        .eq('is_deleted', false)
        .neq('user_id', userId)
        .maybeSingle();

      if (existingUser) {
        this.logger.warn(`Email ${updateProfileDto.email} is already in use by another user`);
        throw new ConflictException('Email already in use by another user');
      }
    }

    // Check if username is being changed and if it's already taken by another active user
    if (updateProfileDto.username && updateProfileDto.username !== currentProfile.username) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', updateProfileDto.username)
        .eq('is_deleted', false)
        .neq('user_id', userId)
        .maybeSingle();

      if (existingUser) {
        this.logger.warn(`Username ${updateProfileDto.username} is already taken by another user`);
        throw new ConflictException('Username already taken');
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateProfileDto.fullName !== undefined) {
      updateData.full_name = updateProfileDto.fullName;
    }
    if (updateProfileDto.email !== undefined) {
      updateData.email = updateProfileDto.email;
    }
    if (updateProfileDto.username !== undefined) {
      updateData.username = updateProfileDto.username;
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
      // Validate JSON data before saving
      if (updateProfileDto.influencerData && typeof updateProfileDto.influencerData === 'object') {
        updateData.influencer_data = updateProfileDto.influencerData;
      } else {
        this.logger.warn(`Invalid influencerData format for user ${userId}, skipping`);
      }
    }
    if (updateProfileDto.advertiserData !== undefined) {
      // Validate JSON data before saving
      if (updateProfileDto.advertiserData && typeof updateProfileDto.advertiserData === 'object') {
        updateData.advertiser_data = updateProfileDto.advertiserData;
      } else {
        this.logger.warn(`Invalid advertiserData format for user ${userId}, skipping`);
      }
    }
    if (updateProfileDto.metrics !== undefined) {
      updateData.metrics = updateProfileDto.metrics;
    }
    if (updateProfileDto.profileCompletion !== undefined) {
      updateData.profile_completion = updateProfileDto.profileCompletion;
    }

    this.logger.log(`Executing update query for user ${userId}`);
    this.logger.debug(`Update payload keys: ${Object.keys(updateData).join(', ')}`);

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .eq('is_deleted', false)
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

      // Check for unique constraint violations (23505 is PostgreSQL unique_violation error code)
      if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
        if (error.message.includes('email') || error.details?.includes('email')) {
          this.logger.warn(`Email conflict for user ${userId}`);
          throw new ConflictException('Email already in use by another user');
        } else if (error.message.includes('username') || error.details?.includes('username')) {
          this.logger.warn(`Username conflict for user ${userId}`);
          throw new ConflictException('Username already taken');
        }
        throw new ConflictException('This information is already in use by another user');
      }

      // Check for data type or validation errors
      if (error.code === '22P02' || error.message.includes('invalid input syntax')) {
        this.logger.error(`Invalid data format for user ${userId}: ${error.message}`);
        throw new InternalServerErrorException('Invalid data format provided');
      }

      // Check for JSON parsing errors
      if (error.message.includes('json') || error.message.includes('JSON')) {
        this.logger.error(`JSON parsing error for user ${userId}: ${error.message}`);
        throw new InternalServerErrorException('Invalid JSON data provided');
      }

      // Log unexpected errors with full details for debugging
      this.logger.error(`Unexpected error updating profile for user ${userId}`, {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        updateData: JSON.stringify(updateData)
      });

      throw new InternalServerErrorException('Failed to update profile. Please try again or contact support.');
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

    // Soft delete - mark as deleted instead of removing from database
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) {
      this.logger.error(`Failed to delete profile: ${error.message}`, {
        error,
        userId
      });
      throw new InternalServerErrorException('Failed to delete profile');
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
      this.logger.error(`Failed to upload avatar: ${uploadError.message}`, {
        uploadError,
        userId,
        filePath
      });
      throw new InternalServerErrorException('Failed to upload avatar');
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar: avatarUrl })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Failed to update profile with avatar: ${updateError.message}`, {
        updateError,
        userId,
        avatarUrl
      });
      throw new InternalServerErrorException('Failed to update profile with avatar');
    }

    return this.transformProfile(updatedProfile);
  }

  async searchProfiles(query: string, userType?: string, limit = 20) {
    const supabase = this.supabaseService.getAdminClient();

    let queryBuilder = supabase
      .from('user_profiles')
      .select('*')
      .eq('is_deleted', false)
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
