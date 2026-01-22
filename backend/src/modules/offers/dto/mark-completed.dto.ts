import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkCompletedDto {
  @ApiProperty({
    description: 'URL of the completion screenshot uploaded to storage',
    example: 'https://example.supabase.co/storage/v1/object/public/completion-screenshots/...'
  })
  @IsString()
  @IsNotEmpty({ message: 'Screenshot URL is required' })
  @IsUrl({}, { message: 'Screenshot URL must be a valid URL' })
  screenshotUrl: string;
}
