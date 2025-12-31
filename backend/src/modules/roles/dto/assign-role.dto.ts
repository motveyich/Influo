import { IsEnum, IsString } from 'class-validator';

export class AssignRoleDto {
  @IsEnum(['user', 'moderator', 'admin'])
  role: 'user' | 'moderator' | 'admin';

  @IsString()
  userId: string;
}
