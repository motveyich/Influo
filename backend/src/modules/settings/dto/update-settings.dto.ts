import { IsOptional, IsObject } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  security?: any;

  @IsOptional()
  @IsObject()
  privacy?: any;

  @IsOptional()
  @IsObject()
  notifications?: any;

  @IsOptional()
  @IsObject()
  interface?: any;

  @IsOptional()
  @IsObject()
  account?: any;
}
