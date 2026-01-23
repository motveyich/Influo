import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength, MinLength, IsObject, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InfluencerDataDto } from './influencer-data.dto';
import { AdvertiserDataDto } from './advertiser-data.dto';
import { InfluencerProfileDto } from './influencer-profile.dto';
import { AdvertiserProfileDto } from './advertiser-profile.dto';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Username',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    example: 'Bio description',
    description: 'User bio',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Bio must be at least 20 characters' })
  @MaxLength(1500, { message: 'Bio must not exceed 1500 characters' })
  bio?: string;

  @ApiProperty({
    example: 'New York, USA',
    description: 'Location',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiProperty({
    example: 'https://example.com',
    description: 'Website URL',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    example: {
      instagram: 'https://instagram.com/user',
      twitter: 'https://twitter.com/user',
    },
    description: 'Social media links',
    required: false,
  })
  @IsOptional()
  @IsObject()
  socialMediaLinks?: Record<string, string>;

  @ApiProperty({
    example: {
      totalFollowers: 10000,
      engagementRate: 5.5,
    },
    description: 'User metrics',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metrics?: Record<string, any>;

  @ApiProperty({
    example: 'influencer',
    description: 'User type',
    required: false,
  })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiProperty({
    description: 'Influencer data (object or null to clear)',
    required: false,
    nullable: true,
    type: () => InfluencerDataDto,
  })
  @IsOptional()
  @ValidateIf((o) => o.influencerData !== null)
  @ValidateNested()
  @Type(() => InfluencerDataDto)
  influencerData?: InfluencerDataDto | null;

  @ApiProperty({
    description: 'Advertiser data (object or null to clear)',
    required: false,
    nullable: true,
    type: () => AdvertiserDataDto,
  })
  @IsOptional()
  @ValidateIf((o) => o.advertiserData !== null)
  @ValidateNested()
  @Type(() => AdvertiserDataDto)
  advertiserData?: AdvertiserDataDto | null;

  @ApiProperty({
    description: 'Profile completion',
    required: false,
  })
  @IsOptional()
  @IsObject()
  profileCompletion?: Record<string, any>;

  @ApiProperty({
    description: 'Influencer profile data (new structure)',
    required: false,
    nullable: true,
    type: () => InfluencerProfileDto,
  })
  @IsOptional()
  @ValidateIf((o) => o.influencerProfile !== null)
  @ValidateNested()
  @Type(() => InfluencerProfileDto)
  influencerProfile?: InfluencerProfileDto | null;

  @ApiProperty({
    description: 'Advertiser profile data (new structure)',
    required: false,
    nullable: true,
    type: () => AdvertiserProfileDto,
  })
  @IsOptional()
  @ValidateIf((o) => o.advertiserProfile !== null)
  @ValidateNested()
  @Type(() => AdvertiserProfileDto)
  advertiserProfile?: AdvertiserProfileDto | null;
}
