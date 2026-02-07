import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { AliPosProcessor } from './processors/alipos.processor';
import { AliPosModule } from '../alipos/alipos.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'alipos-queue',
    }),
    forwardRef(() => AliPosModule),
  ],
  providers: [AliPosProcessor],
  exports: [BullModule],
})
export class JobsModule {}
