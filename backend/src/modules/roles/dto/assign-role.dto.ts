import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    description: 'Role to assign',
    enum: ['user', 'moderator', 'admin'],
    example: 'moderator',
  })
  @IsEnum(['user', 'moderator', 'admin'])
  role: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { department: 'content moderation' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
