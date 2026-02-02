import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ClickWebhookDto {
  @IsNotEmpty()
  @IsString()
  click_trans_id: string;

  @IsNotEmpty()
  @IsString()
  service_id: string;

  @IsNotEmpty()
  @IsString()
  click_paydoc_id: string;

  @IsNotEmpty()
  @IsString()
  merchant_trans_id: string; // Sizning Order ID

  @IsNotEmpty()
  @IsString()
  amount: string;

  @IsNotEmpty()
  @IsString()
  action: string; // 0 - Prepare, 1 - Complete

  @IsNotEmpty()
  @IsString()
  error: string;

  @IsNotEmpty()
  @IsString()
  error_note: string;

  @IsNotEmpty()
  @IsString()
  sign_time: string;

  @IsNotEmpty()
  @IsString()
  sign_string: string;

  // Click ba'zan qo'shimcha parametrlar yuborishi mumkin
  @IsOptional()
  @IsString()
  merchant_prepare_id?: string;
}
