import { IsUUID, IsNumber, IsString, IsOptional, Min, IsObject, IsIn } from 'class-validator';
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

  @ApiProperty({ description: 'Payment type: prepay, postpay, or full' })
  @IsString()
  @IsIn(['prepay', 'postpay', 'full'])
  paymentType: string;

  @ApiProperty({ description: 'Payment method', example: 'bank_transfer' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ description: 'Payment details (bank account, card, etc.)', required: false })
  @IsOptional()
  @IsObject()
  paymentDetails?: Record<string, any>;

  @ApiProperty({ description: 'Additional payment instructions', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
}
