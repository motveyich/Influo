import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength, MinLength, IsObject } from 'class-validator';

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
    example: 'Bio description',
    description: 'User bio',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
}
