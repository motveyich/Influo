import { IsString, IsNotEmpty, IsObject, ValidateNested, IsNumber, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CollaborationFormFieldsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignTitle: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  proposedRate: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  deliverables: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  timeline: string;

  @ApiProperty({ required: false })
  requirements?: string[];

  @ApiProperty({ required: false })
  additionalNotes?: string;
}

export class SendCollaborationRequestDto {
  @ApiProperty({ type: CollaborationFormFieldsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CollaborationFormFieldsDto)
  formFields: CollaborationFormFieldsDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  linkedCampaign: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}
