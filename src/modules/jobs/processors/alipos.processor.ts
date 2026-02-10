import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AliPosService } from '../../alipos/services/alipos.service';

@Injectable()
@Processor('alipos-queue')
export class AliPosProcessor extends WorkerHost {
  private readonly logger = new Logger(AliPosProcessor.name);

  constructor(private readonly aliposService: AliPosService) {
    super();
  }

  async process(job: Job<{ id: string; name: string }>): Promise<void> {
    const { name, id } = job.data;

    this.logger.log(`Processing job: ${name} for id: ${id}`);

    try {
      switch (name) {
        case 'send-order-to-alipos':
          await this.aliposService.sendOrderToAlipos(id);
          this.logger.log(`✅ Order ${id} successfully sent to AliPos`);
          break;
        default:
          throw new Error(`Unknown job name: ${name}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to process job ${name} for id ${id}:`,
        error,
      );

      // Xatolikni throw qilish - BullMQ retry qiladi
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<{ order_id: string; name: string }>) {
    this.logger.log(
      `✅ Job ${job.id} completed for order ${job.data.order_id}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<{ order_id: string; name: string }>) {
    this.logger.error(`❌ Job ${job.id} failed for order ${job.data.order_id}`);
  }
}
