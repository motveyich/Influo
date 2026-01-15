import { IsString, IsUUID, IsOptional, IsEnum, MaxLength, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  receiverId: string;

  @IsString()
  @MaxLength(5000)
  messageContent: string;

  @IsEnum(['text', 'collaboration_offer', 'collaboration_response', 'system', 'conversation_init'])
  @IsOptional()
  messageType?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
