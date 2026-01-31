import { IsString, IsArray, IsOptional, IsEnum, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum AIRequestType {
  CHECK_MESSAGE = 'check_message',
  SUGGEST_REPLY = 'suggest_reply',
  DIALOG_STATUS = 'dialog_status'
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
  @IsOptional()
  userId?: string;

  @IsString()
  conversationId: string;
}
