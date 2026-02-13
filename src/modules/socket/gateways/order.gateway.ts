import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UserRedisService } from '../../redis/user-redis.service';
import { OrderStatusEnum } from '../../order/enums/order-status.enum';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrderGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly userRedisService: UserRedisService) {}

  async handleStatus({
    user_id,
    order_id,
    status,
  }: {
    user_id: number;
    order_id: string;
    status: OrderStatusEnum;
  }) {
    try {
      const sockets = await this.userRedisService.getUserSocketClients(user_id);

      if (!sockets || sockets.length === 0) {
        console.log(`User ${user_id} hozirda oflayn.`);
        return;
      }

      const payload = {
        order_id,
        status,
        timestamp: new Date().toISOString(),
      };

      sockets.forEach((id) => {
        this.server.to(id).emit('handle_order_status', payload);
      });

      console.log(`User ${user_id} ga order status yuborildi: ${status}`);
    } catch (error) {
      console.error('Socket emit xatosi:', error);
    }
  }
}
