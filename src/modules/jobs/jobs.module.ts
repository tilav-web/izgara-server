import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { IikoProcessor } from './processors/iiko.processor';
import { IikoModule } from '../iiko/iiko.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'iiko-queue',
    }),
    forwardRef(() => IikoModule),
    forwardRef(() => BotModule),
  ],
  providers: [IikoProcessor],
  exports: [BullModule],
})
export class JobsModule {}
