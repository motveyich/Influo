import { IsString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiProperty({ description: 'Status', enum: ['open', 'in_progress', 'resolved', 'closed'], required: false })
  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @ApiProperty({ description: 'Priority', enum: ['low', 'normal', 'high', 'urgent'], required: false })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiProperty({ description: 'Assigned admin/moderator ID', required: false })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
