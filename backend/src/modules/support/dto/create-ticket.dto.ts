import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Initial message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Category', enum: ['general', 'technical', 'billing', 'account', 'feature', 'bug'] })
  @IsIn(['general', 'technical', 'billing', 'account', 'feature', 'bug'])
  category: string;

  @ApiProperty({ description: 'Priority', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;
}
