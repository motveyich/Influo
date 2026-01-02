import { IsString, IsOptional, IsObject, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ description: 'User ID from auth system' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'User full name' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Bio' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Website' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'User type' })
  @IsString()
  @IsOptional()
  userType?: string;

  @ApiPropertyOptional({ description: 'Social media links' })
  @IsObject()
  @IsOptional()
  socialMediaLinks?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Influencer data' })
  @IsObject()
  @IsOptional()
  influencerData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Advertiser data' })
  @IsObject()
  @IsOptional()
  advertiserData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Metrics' })
  @IsObject()
  @IsOptional()
  metrics?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Profile completion' })
  @IsObject()
  @IsOptional()
  profileCompletion?: Record<string, any>;
}
