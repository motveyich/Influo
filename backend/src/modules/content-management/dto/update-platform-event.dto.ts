import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformEventDto } from './create-platform-event.dto';

export class UpdatePlatformEventDto extends PartialType(CreatePlatformEventDto) {}
