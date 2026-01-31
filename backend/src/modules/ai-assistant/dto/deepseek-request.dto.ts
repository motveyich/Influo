import { IsString, IsArray, IsOptional, IsEnum, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum AIRequestType {
  SUMMARY = 'summary',
  RISKS = 'risks',
  IMPROVE_MESSAGE = 'improve_message',
  SUGGEST_REPLY = 'suggest_reply',
  SUGGEST_NEXT_STEPS = 'suggest_next_steps'
}

class MessageContextDto {
  @IsString()
  content: string;

  @IsString()
  senderId: string;

  @IsString()
  timestamp: string;
}

export class DeepSeekRequestDto {
  @IsEnum(AIRequestType)
  type: AIRequestType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageContextDto)
  messages: MessageContextDto[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  customPrompt?: string;

  @IsString()
  userId: string;

  @IsString()
  conversationId: string;
}
