import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { IikoProcessor } from './processors/iiko.processor';
import { IikoModule } from '../iiko/iiko.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'iiko-queue',
    }),
    forwardRef(() => IikoModule),
  ],
  providers: [IikoProcessor],
  exports: [BullModule],
})
export class JobsModule {}
