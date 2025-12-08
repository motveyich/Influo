import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentRequestDto {
  @ApiProperty({ description: 'Payment status', enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'paid', 'cancelled'])
  status?: string;

  @ApiProperty({ description: 'Admin notes', required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiProperty({ description: 'Transaction ID', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ description: 'Proof of payment URL', required: false })
  @IsOptional()
  @IsString()
  proofOfPayment?: string;
}
