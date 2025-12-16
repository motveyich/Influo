import { IsString, Length } from 'class-validator';

export class TwoFactorDto {
  @IsString()
  @Length(6, 6)
  verificationCode: string;
}
