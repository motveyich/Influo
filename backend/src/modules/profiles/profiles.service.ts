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
      unified_account_info: {
        isVerified: false,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      },
    };

    const calculatedCompletion = this.calculateProfileCompletionData(profileData);
    profileData.profile_completion = createProfileDto.profileCompletion || calculatedCompletion;

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
      username: updateProfileDto.username,
      fullName: updateProfileDto.fullName
    })}`);

    // Get current profile to check if username actually changed and for calculating completion
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
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
      // Only allow setting user_type to NULL, 'admin', or 'moderator'
      // Regular users should have NULL user_type (unified user model)
      if (updateProfileDto.userType === null || updateProfileDto.userType === 'admin' || updateProfileDto.userType === 'moderator') {
        updateData.user_type = updateProfileDto.userType;
      } else {
        // For 'influencer' or 'advertiser', set to NULL
        updateData.user_type = null;
        this.logger.log(`Converting legacy userType '${updateProfileDto.userType}' to NULL for unified user model`);
      }
    }
    if (updateProfileDto.socialMediaLinks !== undefined) {
      updateData.social_media_links = updateProfileDto.socialMediaLinks;
    }
    if (updateProfileDto.influencerData !== undefined) {
      // null = clear the field, object = update, undefined = don't change
      if (updateProfileDto.influencerData === null) {
        updateData.influencer_data = null;
        this.logger.log(`Clearing influencerData for user ${userId}`);
      } else if (typeof updateProfileDto.influencerData === 'object') {
        updateData.influencer_data = updateProfileDto.influencerData;
      } else {
        this.logger.warn(`Invalid influencerData format for user ${userId}, skipping`);
      }
    }
    if (updateProfileDto.advertiserData !== undefined) {
      // null = clear the field, object = update, undefined = don't change
      if (updateProfileDto.advertiserData === null) {
        updateData.advertiser_data = null;
        this.logger.log(`Clearing advertiserData for user ${userId}`);
      } else if (typeof updateProfileDto.advertiserData === 'object') {
        updateData.advertiser_data = updateProfileDto.advertiserData;
      } else {
        this.logger.warn(`Invalid advertiserData format for user ${userId}, skipping`);
      }
    }
    if (updateProfileDto.influencerProfile !== undefined) {
      // null = clear the field, object = merge with existing, undefined = don't change
      if (updateProfileDto.influencerProfile === null) {
        updateData.influencer_profile = null;
        this.logger.log(`Clearing influencerProfile for user ${userId}`);
      } else if (typeof updateProfileDto.influencerProfile === 'object') {
        // Merge new data with existing influencer profile
        const existingInfluencerProfile = currentProfile.influencer_profile || {};
        updateData.influencer_profile = this.deepMerge(
          existingInfluencerProfile,
          updateProfileDto.influencerProfile
        );
        this.logger.log(`Merged influencerProfile for user ${userId}`);
        this.logger.debug(`Existing profile:`, JSON.stringify(existingInfluencerProfile, null, 2));
        this.logger.debug(`New data:`, JSON.stringify(updateProfileDto.influencerProfile, null, 2));
        this.logger.debug(`Merged result:`, JSON.stringify(updateData.influencer_profile, null, 2));
      } else {
        this.logger.warn(`Invalid influencerProfile format for user ${userId}, skipping`);
      }
    }
    if (updateProfileDto.advertiserProfile !== undefined) {
      // null = clear the field, object = merge with existing, undefined = don't change
      if (updateProfileDto.advertiserProfile === null) {
        updateData.advertiser_profile = null;
        this.logger.log(`Clearing advertiserProfile for user ${userId}`);
      } else if (typeof updateProfileDto.advertiserProfile === 'object') {
        // Merge new data with existing advertiser profile
        const existingAdvertiserProfile = currentProfile.advertiser_profile || {};
        updateData.advertiser_profile = this.deepMerge(
          existingAdvertiserProfile,
          updateProfileDto.advertiserProfile
        );
        this.logger.log(`Merged advertiserProfile for user ${userId}`);
        this.logger.debug(`Existing profile:`, JSON.stringify(existingAdvertiserProfile, null, 2));
        this.logger.debug(`New data:`, JSON.stringify(updateProfileDto.advertiserProfile, null, 2));
        this.logger.debug(`Merged result:`, JSON.stringify(updateData.advertiser_profile, null, 2));
      } else {
        this.logger.warn(`Invalid advertiserProfile format for user ${userId}, skipping`);
      }
    }
    if (updateProfileDto.metrics !== undefined) {
      updateData.metrics = updateProfileDto.metrics;
    }
    if (updateProfileDto.profileCompletion !== undefined) {
      updateData.profile_completion = updateProfileDto.profileCompletion;
    }

    const mergedProfile = { ...currentProfile, ...updateData };
    const calculatedCompletion = this.calculateProfileCompletionData(mergedProfile);
    updateData.profile_completion = updateProfileDto.profileCompletion || calculatedCompletion;

    this.logger.log(`Executing update query for user ${userId}`);
    this.logger.debug(`Update payload keys: ${Object.keys(updateData).join(', ')}`);

    // Sanitize JSON data before sending to Supabase
    if (updateData.influencer_data !== undefined) {
      try {
        if (updateData.influencer_data === null) {
          this.logger.log(`Setting influencer_data to null for user ${userId}`);
        } else if (typeof updateData.influencer_data === 'object') {
          updateData.influencer_data = this.sanitizeInfluencerData(updateData.influencer_data);
          this.logger.log(`Sanitized influencer_data for user ${userId}`);
        }
      } catch (sanitizeError: any) {
        this.logger.error(`Failed to sanitize influencer_data: ${sanitizeError.message}`, sanitizeError);
        throw new InternalServerErrorException('Invalid influencer data format');
      }
    }

    if (updateData.advertiser_data !== undefined) {
      try {
        if (updateData.advertiser_data === null) {
          this.logger.log(`Setting advertiser_data to null for user ${userId}`);
        } else if (typeof updateData.advertiser_data === 'object') {
          updateData.advertiser_data = this.sanitizeAdvertiserData(updateData.advertiser_data);
          this.logger.log(`Sanitized advertiser_data for user ${userId}`);
        }
      } catch (sanitizeError: any) {
        this.logger.error(`Failed to sanitize advertiser_data: ${sanitizeError.message}`, sanitizeError);
        throw new InternalServerErrorException('Invalid advertiser data format');
      }
    }

    if (updateData.influencer_profile !== undefined) {
      try {
        if (updateData.influencer_profile === null) {
          this.logger.log(`Setting influencer_profile to null for user ${userId}`);
        } else if (typeof updateData.influencer_profile === 'object') {
          updateData.influencer_profile = this.sanitizeInfluencerProfile(updateData.influencer_profile);
          this.logger.log(`Sanitized influencer_profile for user ${userId}`);
        }
      } catch (sanitizeError: any) {
        this.logger.error(`Failed to sanitize influencer_profile: ${sanitizeError.message}`, sanitizeError);
        throw new InternalServerErrorException('Invalid influencer profile format');
      }
    }

    if (updateData.advertiser_profile !== undefined) {
      try {
        if (updateData.advertiser_profile === null) {
          this.logger.log(`Setting advertiser_profile to null for user ${userId}`);
        } else if (typeof updateData.advertiser_profile === 'object') {
          updateData.advertiser_profile = this.sanitizeAdvertiserProfile(updateData.advertiser_profile);
          this.logger.log(`Sanitized advertiser_profile for user ${userId}`);
        }
      } catch (sanitizeError: any) {
        this.logger.error(`Failed to sanitize advertiser_profile: ${sanitizeError.message}`, sanitizeError);
        throw new InternalServerErrorException('Invalid advertiser profile format');
      }
    }

    // CRITICAL DEBUG: Log full updateData structure before sending to Supabase
    this.logger.debug('=== PROFILE UPDATE DEBUG START ===');
    this.logger.debug(`userId: ${userId}`);
    this.logger.debug(`updateData keys: ${Object.keys(updateData).join(', ')}`);
    if (updateData.influencer_data !== undefined) {
      this.logger.debug(`influencer_data type: ${typeof updateData.influencer_data}`);
      this.logger.debug(`influencer_data: ${JSON.stringify(updateData.influencer_data, null, 2)}`);
    }
    if (updateData.advertiser_data !== undefined) {
      this.logger.debug(`advertiser_data type: ${typeof updateData.advertiser_data}`);
      this.logger.debug(`advertiser_data: ${JSON.stringify(updateData.advertiser_data, null, 2)}`);
    }
    this.logger.debug('=== PROFILE UPDATE DEBUG END ===');

    let updatedProfile;
    let error;

    try {
      const result = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .select()
        .single();

      updatedProfile = result.data;
      error = result.error;
    } catch (syncError: any) {
      console.error('=== SYNCHRONOUS ERROR CAUGHT ===');
      console.error('Error message:', syncError.message);
      console.error('Error stack:', syncError.stack);
      console.error('Error object:', syncError);
      console.error('=================================');
      this.logger.error(`Synchronous error during profile update: ${syncError.message}`, syncError);
      throw new InternalServerErrorException(`Profile update failed: ${syncError.message}`);
    }

    if (error) {
      // CRITICAL DEBUG: Log full error details
      console.error('=== SUPABASE ERROR DETAILS ===');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Update data that caused error:', JSON.stringify(updateData, null, 2));
      console.error('==============================');

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

  async deleteAvatar(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('avatar, user_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (profileError || !profile) {
      throw new NotFoundException('Profile not found');
    }

    if (profile.avatar) {
      const avatarPath = profile.avatar.split('/').slice(-2).join('/');

      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([avatarPath]);

      if (deleteError) {
        this.logger.error(`Failed to delete avatar from storage: ${deleteError.message}`, {
          deleteError,
          userId,
          avatarPath,
        });
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar: null })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Failed to update profile after avatar deletion: ${updateError.message}`, {
        updateError,
        userId,
      });
      throw new InternalServerErrorException('Failed to delete avatar');
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

  private sanitizeInfluencerData(data: any): any {
    if (!data || data === null) return null;

    const sanitized: any = {};

    if (data.socialMediaLinks !== undefined) {
      sanitized.socialMediaLinks = Array.isArray(data.socialMediaLinks)
        ? data.socialMediaLinks.filter((link: any) => link && typeof link === 'object')
        : [];
    }

    if (data.metrics !== undefined && data.metrics !== null) {
      sanitized.metrics = {
        totalFollowers: this.toNumber(data.metrics.totalFollowers, 0),
        engagementRate: this.toNumber(data.metrics.engagementRate, 0),
        averageViews: this.toNumber(data.metrics.averageViews, 0),
        monthlyGrowth: this.toNumber(data.metrics.monthlyGrowth, 0),
      };
    }

    if (data.contentCategories !== undefined) {
      sanitized.contentCategories = Array.isArray(data.contentCategories)
        ? data.contentCategories.filter((cat: any) => typeof cat === 'string')
        : [];
    }

    if (data.availableForCollabs !== undefined) {
      sanitized.availableForCollabs = Boolean(data.availableForCollabs);
    }

    if (data.pricing !== undefined && data.pricing !== null) {
      sanitized.pricing = {
        post: this.toNumber(data.pricing.post, 0),
        story: this.toNumber(data.pricing.story, 0),
        reel: this.toNumber(data.pricing.reel, 0),
        video: this.toNumber(data.pricing.video, 0),
      };
    }

    if (data.mainSocialLink !== undefined) {
      sanitized.mainSocialLink = String(data.mainSocialLink || '');
    }

    if (data.category !== undefined) {
      sanitized.category = String(data.category || '');
    }

    if (data.platformName !== undefined) {
      sanitized.platformName = String(data.platformName || '');
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }

  private sanitizeAdvertiserData(data: any): any {
    if (!data || data === null) return null;

    const sanitized: any = {};

    if (data.companyName !== undefined) {
      sanitized.companyName = String(data.companyName || '');
    }

    if (data.industry !== undefined) {
      sanitized.industry = String(data.industry || '');
    }

    if (data.companyWebsite !== undefined) {
      sanitized.companyWebsite = String(data.companyWebsite || '');
    }

    if (data.companyDescription !== undefined) {
      sanitized.companyDescription = String(data.companyDescription || '');
    }

    if (data.previousCampaigns !== undefined) {
      sanitized.previousCampaigns = this.toNumber(data.previousCampaigns, 0);
    }

    if (data.averageBudget !== undefined) {
      sanitized.averageBudget = this.toNumber(data.averageBudget, 0);
    }

    if (data.campaignPreferences !== undefined && data.campaignPreferences !== null) {
      const prefs: any = {};

      if (data.campaignPreferences.preferredPlatforms !== undefined) {
        prefs.preferredPlatforms = Array.isArray(data.campaignPreferences.preferredPlatforms)
          ? data.campaignPreferences.preferredPlatforms.filter((p: any) => typeof p === 'string')
          : [];
      }

      if (data.campaignPreferences.budgetRange !== undefined && data.campaignPreferences.budgetRange !== null) {
        prefs.budgetRange = {
          min: this.toNumber(data.campaignPreferences.budgetRange.min, 0),
          max: this.toNumber(data.campaignPreferences.budgetRange.max, 0),
          currency: String(data.campaignPreferences.budgetRange.currency || 'USD'),
        };
      }

      if (data.campaignPreferences.targetAudience !== undefined && data.campaignPreferences.targetAudience !== null) {
        const audience = data.campaignPreferences.targetAudience;
        prefs.targetAudience = {
          ageRange: Array.isArray(audience.ageRange)
            ? audience.ageRange.map((n: any) => this.toNumber(n, 18))
            : [18, 65],
          genders: Array.isArray(audience.genders)
            ? audience.genders.filter((g: any) => typeof g === 'string')
            : [],
          countries: Array.isArray(audience.countries)
            ? audience.countries.filter((c: any) => typeof c === 'string')
            : [],
          interests: Array.isArray(audience.interests)
            ? audience.interests.filter((i: any) => typeof i === 'string')
            : [],
        };
      }

      if (data.campaignPreferences.campaignTypes !== undefined) {
        prefs.campaignTypes = Array.isArray(data.campaignPreferences.campaignTypes)
          ? data.campaignPreferences.campaignTypes.filter((t: any) => typeof t === 'string')
          : [];
      }

      if (Object.keys(prefs).length > 0) {
        sanitized.campaignPreferences = prefs;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }

  private sanitizeInfluencerProfile(data: any): any {
    if (!data || data === null) return null;

    const sanitized: any = {};

    // NOTE: avatar is removed from influencer_profile and should only be in user_profiles.avatar

    // Basic fields
    if (data.nickname !== undefined) {
      sanitized.nickname = String(data.nickname || '');
    }
    if (data.country !== undefined) {
      sanitized.country = String(data.country || '');
    }
    if (data.city !== undefined) {
      sanitized.city = String(data.city || '');
    }
    if (data.bio !== undefined) {
      sanitized.bio = String(data.bio || '');
    }

    // Primary niches
    if (data.primaryNiches !== undefined) {
      sanitized.primaryNiches = Array.isArray(data.primaryNiches)
        ? data.primaryNiches.filter((n: any) => typeof n === 'string')
        : [];
    }

    // Content languages
    if (data.contentLanguages !== undefined) {
      sanitized.contentLanguages = Array.isArray(data.contentLanguages)
        ? data.contentLanguages.filter((l: any) => typeof l === 'string')
        : [];
    }

    // Audience overview
    if (data.audienceOverview !== undefined && data.audienceOverview !== null) {
      const audience: any = {};
      if (data.audienceOverview.primaryCountries !== undefined) {
        audience.primaryCountries = Array.isArray(data.audienceOverview.primaryCountries)
          ? data.audienceOverview.primaryCountries.filter((c: any) => typeof c === 'string')
          : [];
      }
      if (data.audienceOverview.ageRange !== undefined && data.audienceOverview.ageRange !== null) {
        audience.ageRange = {
          min: this.toNumber(data.audienceOverview.ageRange.min, 0),
          max: this.toNumber(data.audienceOverview.ageRange.max, 0),
        };
      }
      if (data.audienceOverview.genderDistribution !== undefined && data.audienceOverview.genderDistribution !== null) {
        audience.genderDistribution = {
          male: this.toNumber(data.audienceOverview.genderDistribution.male, 0),
          female: this.toNumber(data.audienceOverview.genderDistribution.female, 0),
          other: this.toNumber(data.audienceOverview.genderDistribution.other, 0),
        };
      }
      if (data.audienceOverview.predominantGender !== undefined) {
        audience.predominantGender = String(data.audienceOverview.predominantGender || '');
      }
      if (data.audienceOverview.audienceSizeRange !== undefined) {
        audience.audienceSizeRange = String(data.audienceOverview.audienceSizeRange || '');
      }
      if (Object.keys(audience).length > 0) {
        sanitized.audienceOverview = audience;
      }
    }

    // Preferred brand categories
    if (data.preferredBrandCategories !== undefined) {
      sanitized.preferredBrandCategories = Array.isArray(data.preferredBrandCategories)
        ? data.preferredBrandCategories.filter((c: any) => typeof c === 'string')
        : [];
    }

    // Boolean flags
    if (data.openToLongTermCollabs !== undefined) {
      sanitized.openToLongTermCollabs = Boolean(data.openToLongTermCollabs);
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }

  private sanitizeAdvertiserProfile(data: any): any {
    if (!data || data === null) return null;

    const sanitized: any = {};

    // NOTE: logo is removed from advertiser_profile and should only be in user_profiles.avatar

    // Basic company info
    if (data.companyName !== undefined) {
      sanitized.companyName = String(data.companyName || '');
    }
    if (data.companyDescription !== undefined) {
      sanitized.companyDescription = String(data.companyDescription || '');
    }
    if (data.organizationWebsite !== undefined) {
      sanitized.organizationWebsite = String(data.organizationWebsite || '');
    }

    // Business categories
    if (data.businessCategories !== undefined) {
      sanitized.businessCategories = Array.isArray(data.businessCategories)
        ? data.businessCategories.filter((c: any) => typeof c === 'string')
        : [];
    }

    // Brand values
    if (data.brandValues !== undefined) {
      sanitized.brandValues = Array.isArray(data.brandValues)
        ? data.brandValues.filter((v: any) => typeof v === 'string')
        : [];
    }

    // Typical budget range
    if (data.typicalBudgetRange !== undefined && data.typicalBudgetRange !== null) {
      sanitized.typicalBudgetRange = {
        min: this.toNumber(data.typicalBudgetRange.min, 0),
        max: this.toNumber(data.typicalBudgetRange.max, 0),
        currency: String(data.typicalBudgetRange.currency || 'USD'),
      };
    }

    // Typical integration types
    if (data.typicalIntegrationTypes !== undefined) {
      sanitized.typicalIntegrationTypes = Array.isArray(data.typicalIntegrationTypes)
        ? data.typicalIntegrationTypes.filter((t: any) => typeof t === 'string')
        : [];
    }

    // Payment policies
    if (data.paymentPolicies !== undefined) {
      sanitized.paymentPolicies = Array.isArray(data.paymentPolicies)
        ? data.paymentPolicies.filter((p: any) => typeof p === 'string')
        : [];
    }

    // Target demographics
    if (data.targetDemographics !== undefined && data.targetDemographics !== null) {
      const demo: any = {};
      if (data.targetDemographics.ageRange !== undefined && data.targetDemographics.ageRange !== null) {
        demo.ageRange = {
          min: this.toNumber(data.targetDemographics.ageRange.min, 0),
          max: this.toNumber(data.targetDemographics.ageRange.max, 0),
        };
      }
      if (Object.keys(demo).length > 0) {
        sanitized.targetDemographics = demo;
      }
    }

    // Boolean flags
    if (data.workWithMicroInfluencers !== undefined) {
      sanitized.workWithMicroInfluencers = Boolean(data.workWithMicroInfluencers);
    }
    if (data.giveCreativeFreedom !== undefined) {
      sanitized.giveCreativeFreedom = Boolean(data.giveCreativeFreedom);
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }

  private toNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private deepMerge(target: any, source: any): any {
    if (!source || typeof source !== 'object') {
      return target;
    }

    if (!target || typeof target !== 'object') {
      return source;
    }

    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (sourceValue === undefined) {
          continue;
        }

        if (sourceValue === null) {
          result[key] = null;
        } else if (Array.isArray(sourceValue)) {
          result[key] = sourceValue;
        } else if (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }

    return result;
  }

  private calculateProfileCompletionData(profile: any) {
    let basicInfoComplete = false;
    let influencerSetupComplete = false;
    let advertiserSetupComplete = false;

    const hasFullName = profile.full_name && profile.full_name.trim() !== '';
    const hasEmail = profile.email && profile.email.trim() !== '';
    const hasPhone = profile.phone && profile.phone.trim() !== '';
    const hasLocation = profile.location && profile.location.trim() !== '';
    const hasBio = profile.bio && profile.bio.trim() !== '' && profile.bio.trim().length >= 50;

    if (hasFullName && hasEmail && hasLocation && hasBio) {
      basicInfoComplete = true;
    }

    const influencerData = profile.influencer_data;
    if (influencerData && typeof influencerData === 'object') {
      const hasMainSocialLink = influencerData.mainSocialLink && influencerData.mainSocialLink.trim() !== '';
      const hasCategory = influencerData.category && influencerData.category.trim() !== '';
      const hasPlatformName = influencerData.platformName && influencerData.platformName.trim() !== '';
      const hasLinks = Array.isArray(influencerData.socialMediaLinks) && influencerData.socialMediaLinks.length > 0;
      const hasMetrics = influencerData.metrics && influencerData.metrics.totalFollowers > 0;
      const hasCategories = Array.isArray(influencerData.contentCategories) && influencerData.contentCategories.length > 0;
      const hasPricing = influencerData.pricing && Object.values(influencerData.pricing).some((price: any) => price > 0);

      influencerSetupComplete = hasMainSocialLink || hasCategory || hasPlatformName || hasLinks || hasMetrics || hasCategories || hasPricing;
    }

    const advertiserData = profile.advertiser_data;
    if (advertiserData && typeof advertiserData === 'object') {
      const hasCompanyName = advertiserData.companyName && advertiserData.companyName.trim() !== '';
      const hasCompanyWebsite = advertiserData.companyWebsite && advertiserData.companyWebsite.trim() !== '';
      const hasCompanyDescription = advertiserData.companyDescription && advertiserData.companyDescription.trim() !== '';
      const hasIndustry = advertiserData.industry && advertiserData.industry.trim() !== '';
      const hasBudget = advertiserData.campaignPreferences &&
                       (advertiserData.campaignPreferences.budgetRange?.min > 0 ||
                        advertiserData.campaignPreferences.budgetRange?.max > 0);
      const hasPreviousCampaigns = advertiserData.previousCampaigns > 0;
      const hasAverageBudget = advertiserData.averageBudget > 0;

      advertiserSetupComplete = hasCompanyName || hasCompanyWebsite || hasCompanyDescription || hasIndustry || hasBudget || hasPreviousCampaigns || hasAverageBudget;
    }

    let completionPercentage = 0;
    if (basicInfoComplete) completionPercentage += 50;
    if (influencerSetupComplete) completionPercentage += 25;
    if (advertiserSetupComplete) completionPercentage += 25;

    const overallComplete = basicInfoComplete && influencerSetupComplete && advertiserSetupComplete;

    const missingFields: string[] = [];
    if (!hasFullName) missingFields.push('fullName');
    if (!hasEmail) missingFields.push('email');
    if (!hasPhone) missingFields.push('phone');
    if (!hasLocation) missingFields.push('location');
    if (!hasBio) missingFields.push('bio');

    return {
      basicInfo: basicInfoComplete,
      influencerSetup: influencerSetupComplete,
      advertiserSetup: advertiserSetupComplete,
      overallComplete,
      completionPercentage,
      missingFields,
    };
  }

  async getUserStats(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('completed_deals_count, total_reviews_count, average_rating')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (profileError) {
        this.logger.error(`Failed to fetch profile metrics: ${profileError.message}`, profileError);
      }

      const { data: pendingOffers, error: offersError } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .or(`influencer_id.eq.${userId},advertiser_id.eq.${userId}`)
        .eq('status', 'pending');

      if (offersError) {
        this.logger.error(`Failed to fetch pending offers: ${offersError.message}`, offersError);
      }

      const { count: pendingCount } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .or(`influencer_id.eq.${userId},advertiser_id.eq.${userId}`)
        .eq('status', 'pending');

      const { data: unreadMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (messagesError) {
        this.logger.error(`Failed to fetch unread messages: ${messagesError.message}`, messagesError);
      }

      const { count: unreadCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      const { data: offers, error: offersListError } = await supabase
        .from('offers')
        .select('id as offer_id, influencer_id, advertiser_id')
        .or(`influencer_id.eq.${userId},advertiser_id.eq.${userId}`)
        .in('status', ['accepted', 'in_progress']);

      let pendingPayoutsCount = 0;
      if (offers && offers.length > 0) {
        const offerIds = offers.map(o => o.offer_id);
        const { data: paymentRequests } = await supabase
          .from('payment_requests')
          .select('id, offer_id, status')
          .in('offer_id', offerIds);

        if (paymentRequests) {
          pendingPayoutsCount = paymentRequests.filter(pr => {
            const offer = offers.find(o => o.offer_id === pr.offer_id);
            if (!offer) return false;

            const isAdvertiser = offer.advertiser_id === userId;
            const isInfluencer = offer.influencer_id === userId;

            if (isAdvertiser && ['pending', 'paying'].includes(pr.status)) {
              return true;
            }

            if (isInfluencer && pr.status === 'paid') {
              return true;
            }

            return false;
          }).length;
        }
      }

      return {
        pendingApplications: pendingCount || 0,
        unreadMessages: unreadCount || 0,
        pendingPayouts: pendingPayoutsCount,
        accountRating: Number((profile?.average_rating || 0).toFixed(1)),
        totalReviews: profile?.total_reviews_count || 0,
        completedDeals: profile?.completed_deals_count || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get user stats: ${error.message}`, error);
      return {
        pendingApplications: 0,
        unreadMessages: 0,
        pendingPayouts: 0,
        accountRating: 0,
        totalReviews: 0,
        completedDeals: 0,
      };
    }
  }

  private transformProfile(profile: any) {
    const profileCompletion = profile.profile_completion || this.calculateProfileCompletionData(profile);

    // DIAGNOSTIC LOGGING: Check if bio, location, website are present in DB
    this.logger.debug(`[transformProfile] Raw DB data for user ${profile.user_id}:`, {
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      hasBio: !!profile.bio,
      hasLocation: !!profile.location,
      hasWebsite: !!profile.website,
    });

    const transformed = {
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
      influencerProfile: profile.influencer_profile || null,
      advertiserProfile: profile.advertiser_profile || null,
      metrics: profile.metrics || {},
      profileCompletion,
      unifiedAccountInfo: profile.unified_account_info || {},
      isDeleted: profile.is_deleted || false,
      deletedAt: profile.deleted_at || null,
      deletedBy: profile.deleted_by || null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    this.logger.debug(`[transformProfile] Transformed API response:`, {
      bio: transformed.bio,
      location: transformed.location,
      website: transformed.website,
    });

    return transformed;
  }
}
