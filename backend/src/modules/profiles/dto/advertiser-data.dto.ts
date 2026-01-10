import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetRangeDto {
  @ApiProperty({ example: 1000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min?: number;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max?: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class TargetAudienceDto {
  @ApiProperty({ example: [18, 65], required: false })
  @IsOptional()
  @IsArray()
  ageRange?: number[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  genders?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  countries?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  interests?: string[];
}

export class CampaignPreferencesDto {
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  preferredPlatforms?: string[];

  @ApiProperty({ type: BudgetRangeDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange?: BudgetRangeDto;

  @ApiProperty({ type: TargetAudienceDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetAudienceDto)
  targetAudience?: TargetAudienceDto;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  campaignTypes?: string[];
}

export class AdvertiserDataDto {
  @ApiProperty({ example: 'Company Name', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: 'Technology', required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ type: CampaignPreferencesDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignPreferencesDto)
  campaignPreferences?: CampaignPreferencesDto;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  previousCampaigns?: number;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageBudget?: number;

  @ApiProperty({ example: 'https://company.com', required: false })
  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @ApiProperty({ example: 'Company description', required: false })
  @IsOptional()
  @IsString()
  companyDescription?: string;
}
