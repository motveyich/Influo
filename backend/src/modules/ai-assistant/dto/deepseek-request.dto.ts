import { IsString, IsArray, IsOptional, IsEnum, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum AIRequestType {
  SUMMARY = 'summary',
  RISKS = 'risks',
  IMPROVE_MESSAGE = 'improve_message',
  SUGGEST_REPLY = 'suggest_reply',
  SUGGEST_NEXT_STEPS = 'suggest_next_steps',
  CHECK_MESSAGE = 'check_message',
  SUGGEST_FIRST_MESSAGE = 'suggest_first_message',
  CHECKLIST = 'checklist',
  FORMULATE_NEUTRAL = 'formulate_neutral',
  REVIEW_HELP = 'review_help'
}

export enum DealStage {
  PRE_CONTACT = 'pre_contact',
  INITIAL_CONTACT = 'initial_contact',
  NEGOTIATION = 'negotiation',
  DECISION = 'decision',
  COLLABORATION = 'collaboration',
  NEAR_COMPLETION = 'near_completion',
  COMPLETION = 'completion',
  UNKNOWN = 'unknown'
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

  @IsEnum(DealStage)
  @IsOptional()
  dealStage?: DealStage;
}
