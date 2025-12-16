import { IsString, IsUUID, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'ID of the message receiver',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  receiverId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello! I would like to discuss collaboration opportunities.',
    maxLength: 5000,
  })
  @IsString()
  @MaxLength(5000)
  messageContent: string;

  @ApiPropertyOptional({
    description: 'Message type',
    enum: ['text', 'offer', 'system'],
    default: 'text',
  })
  @IsOptional()
  @IsEnum(['text', 'offer', 'system'])
  messageType?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { offerId: '123', campaignId: '456' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
