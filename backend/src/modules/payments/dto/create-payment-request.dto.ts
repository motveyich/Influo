import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentRequestDto {
  @ApiProperty({ description: 'Offer ID' })
  @IsUUID()
  offerId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Payment description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Payment method', example: 'bank_transfer', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
