import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './payment-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction])],
  controllers: [],
  providers: [],
  exports: [],
})
export class PaymentModule {}
