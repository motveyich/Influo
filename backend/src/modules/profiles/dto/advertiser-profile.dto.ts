import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsBoolean, IsOptional, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetRangeDto } from './advertiser-data.dto';

export class TargetAgeRangeDto {
  @ApiProperty({ example: 18, required: false })
  @IsOptional()
  min?: number;

  @ApiProperty({ example: 45, required: false })
  @IsOptional()
  max?: number;
}

export class TargetDemographicsDto {
  @ApiProperty({ type: TargetAgeRangeDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetAgeRangeDto)
  ageRange?: TargetAgeRangeDto;
}

export class AdvertiserProfileDto {
  @ApiProperty({ example: 'ООО Инфлюо', required: true })
  @IsString()
  companyName!: string;

  @ApiProperty({ example: 'Россия', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Москва', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'https://example.com', required: false })
  @IsOptional()
  @IsString()
  organizationWebsite?: string;

  @ApiProperty({
    example: 'Мы компания, занимающаяся производством экологичной косметики. Наша миссия - предоставлять качественные продукты...',
    required: true
  })
  @IsString()
  @MinLength(100, { message: 'Описание компании должно содержать минимум 100 символов' })
  companyDescription!: string;

  @ApiProperty({ example: ['Косметика и красота', 'E-commerce'], required: true })
  @IsArray()
  businessCategories!: string[];

  @ApiProperty({ example: ['Экологичность', 'Качество', 'Инновации'], required: false })
  @IsOptional()
  @IsArray()
  brandValues?: string[];

  @ApiProperty({ example: ['Нативная интеграция', 'Обзор продукта', 'UGC контент'], required: false })
  @IsOptional()
  @IsArray()
  typicalIntegrationTypes?: string[];

  @ApiProperty({ type: BudgetRangeDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  typicalBudgetRange?: BudgetRangeDto;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  workWithMicroInfluencers?: boolean;

  @ApiProperty({ example: ['Оплата после публикации', 'Частичная предоплата (50%)'], required: false })
  @IsOptional()
  @IsArray()
  paymentPolicies?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  giveCreativeFreedom?: boolean;

  @ApiProperty({ type: TargetDemographicsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetDemographicsDto)
  targetDemographics?: TargetDemographicsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  reputationData?: any;
}
