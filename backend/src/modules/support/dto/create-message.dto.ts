import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Is staff response', required: false })
  @IsOptional()
  @IsBoolean()
  isStaffResponse?: boolean;
}
