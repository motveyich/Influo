import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiPropertyOptional({
    description: 'Reason for blocking the user',
    example: 'Violation of community guidelines',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
