import { IsUUID } from 'class-validator';

export class InitializeConversationDto {
  @IsUUID()
  participantId: string;
}
