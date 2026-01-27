import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformUpdateDto } from './create-platform-update.dto';

export class UpdatePlatformUpdateDto extends PartialType(CreatePlatformUpdateDto) {}
