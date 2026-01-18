import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAYING = 'paying',
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'New status for the payment request',
    enum: PaymentStatus,
    example: 'pending',
  })
  @IsEnum(PaymentStatus)
  @IsString()
  status: PaymentStatus;
}
