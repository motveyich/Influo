import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondCollaborationRequestDto {
  @ApiProperty({ enum: ['accepted', 'declined'] })
  @IsEnum(['accepted', 'declined'])
  response: 'accepted' | 'declined';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  responseData?: any;
}
