import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsBoolean, IsOptional, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AgeRangeDto {
  @ApiProperty({ example: 18, required: false })
  @IsOptional()
  min?: number;

  @ApiProperty({ example: 35, required: false })
  @IsOptional()
  max?: number;
}

export class GenderDistributionDto {
  @ApiProperty({ example: 40, required: false })
  @IsOptional()
  male?: number;

  @ApiProperty({ example: 55, required: false })
  @IsOptional()
  female?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  other?: number;
}

export class AudienceOverviewDto {
  @ApiProperty({ example: ['Россия', 'Казахстан'], required: false })
  @IsOptional()
  @IsArray()
  primaryCountries?: string[];

  @ApiProperty({ type: AgeRangeDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgeRangeDto)
  ageRange?: AgeRangeDto;

  @ApiProperty({ type: GenderDistributionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenderDistributionDto)
  genderDistribution?: GenderDistributionDto;

  @ApiProperty({ example: 'Женский', required: false })
  @IsOptional()
  @IsString()
  predominantGender?: string;

  @ApiProperty({ example: 'Микро (10к-50к)', required: false })
  @IsOptional()
  @IsString()
  audienceSizeRange?: string;
}

export class InfluencerProfileDto {
  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: 'coolblogger', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ example: 'Россия', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Москва', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: ['Русский', 'Английский'], required: false })
  @IsOptional()
  @IsArray()
  contentLanguages?: string[];

  @ApiProperty({
    example: 'Я занимаюсь созданием контента о моде и стиле жизни. Работаю с брендами косметики и одежды...',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(100, { message: 'Био должно содержать минимум 100 символов' })
  @MaxLength(500, { message: 'Био не должно превышать 500 символов' })
  bio?: string;

  @ApiProperty({ example: ['Мода и стиль', 'Красота и косметика', 'Лайфстайл'], required: false })
  @IsOptional()
  @IsArray()
  primaryNiches?: string[];

  @ApiProperty({ example: ['Путешествия', 'Фотография'], required: false })
  @IsOptional()
  @IsArray()
  secondaryNiches?: string[];

  @ApiProperty({ type: AudienceOverviewDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceOverviewDto)
  audienceOverview?: AudienceOverviewDto;

  @ApiProperty({ example: ['Косметика', 'Одежда', 'Аксессуары'], required: false })
  @IsOptional()
  @IsArray()
  preferredBrandCategories?: string[];

  @ApiProperty({ example: ['Алкоголь', 'Табак'], required: false })
  @IsOptional()
  @IsArray()
  excludedBrandCategories?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  openToLongTermCollabs?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  reputationData?: any;
}
