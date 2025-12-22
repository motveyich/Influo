import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchUsersDto {
  @ApiPropertyOptional({
    description: 'Search query for user name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  searchQuery?: string;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: ['user', 'moderator', 'admin'],
  })
  @IsOptional()
  @IsEnum(['user', 'moderator', 'admin'])
  role?: string;

  @ApiPropertyOptional({
    description: 'Filter by deleted status',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDeleted?: boolean;
}
