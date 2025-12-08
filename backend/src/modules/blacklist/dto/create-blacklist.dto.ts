import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBlacklistDto {
  @ApiProperty({ description: 'User ID to block' })
  @IsUUID()
  blockedId: string;

  @ApiProperty({ description: 'Reason for blocking', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
