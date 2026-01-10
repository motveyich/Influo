import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsArray, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class InfluencerMetricsDto {
  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalFollowers?: number;

  @ApiProperty({ example: 5.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  engagementRate?: number;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageViews?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  monthlyGrowth?: number;
}

export class InfluencerPricingDto {
  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  post?: number;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  story?: number;

  @ApiProperty({ example: 150, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reel?: number;

  @ApiProperty({ example: 200, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  video?: number;
}

export class SocialMediaLinkDto {
  @ApiProperty({ example: 'instagram' })
  @IsOptional()
  platform?: string;

  @ApiProperty({ example: 'https://instagram.com/user' })
  @IsOptional()
  url?: string;

  @ApiProperty({ example: 'username' })
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  followers?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

export class InfluencerDataDto {
  @ApiProperty({ type: [SocialMediaLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaLinkDto)
  socialMediaLinks?: SocialMediaLinkDto[];

  @ApiProperty({ type: InfluencerMetricsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => InfluencerMetricsDto)
  metrics?: InfluencerMetricsDto;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  contentCategories?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  availableForCollabs?: boolean;

  @ApiProperty({ type: InfluencerPricingDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => InfluencerPricingDto)
  pricing?: InfluencerPricingDto;

  @ApiProperty({ example: 'instagram', required: false })
  @IsOptional()
  mainSocialLink?: string;

  @ApiProperty({ example: 'Technology', required: false })
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'Instagram', required: false })
  @IsOptional()
  platformName?: string;
}
