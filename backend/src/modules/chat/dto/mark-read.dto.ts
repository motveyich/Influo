import { IsUUID, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    description: 'Array of message IDs to mark as read',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}
