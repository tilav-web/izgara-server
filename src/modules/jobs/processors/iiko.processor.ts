import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IikoService } from '../../iiko/services/iiko.service';
import { OrderBotService } from '../../bot/services/order-bot.service';

@Injectable()
@Processor('iiko-queue')
export class IikoProcessor extends WorkerHost {
  private readonly logger = new Logger(IikoProcessor.name);

  constructor(
    private readonly iikoService: IikoService,
    private readonly orderBotService: OrderBotService,
  ) {
    super();
  }

  async process(job: Job<{ id: string }>): Promise<void> {
    const { id } = job.data;
    const name = job.name;

    this.logger.log(`Processing job: ${name} for id: ${id}`);

    try {
      switch (name) {
        case 'send-order-to-iiko':
          await this.iikoService.sendOrderToIiko(id);
          this.logger.log(`Order ${id} successfully sent to IIKO`);
          break;
        case 'cancel-order-in-iiko':
          await this.iikoService.cancelOrderInIiko(id);
          this.logger.log(`Order ${id} successfully cancelled in IIKO`);
          break;
        default:
          throw new Error(`Unknown job name: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process job ${name} for id ${id}:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<{ id: string }>) {
    this.logger.log(`Job ${job.id} completed for order ${job.data.id}`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<{ id: string }>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for order ${job.data.id}: ${error?.message || error}`,
    );

    if (job.name === 'send-order-to-iiko') {
      const maxAttempts = job.opts?.attempts || 5;
      if (job.attemptsMade >= maxAttempts) {
        try {
          await this.orderBotService.sendIikoErrorNotification(
            job.data.id,
            error?.message ||
              'IIKO serveri javob bermadi yoki buyurtmani qabul qilmadi',
          );
        } catch (botError) {
          this.logger.error(
            `Telegram bot orqali IIKO xatolik xabarini yuborishda muammo:`,
            botError,
          );
        }
      }
    }
  }
}
