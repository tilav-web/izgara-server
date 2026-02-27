import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UserRedisService } from '../../redis/user-redis.service';
import { Order } from '../../order/schemas/order.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrderGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly userRedisService: UserRedisService) {}

  async handleOrder({ user_id, order }: { user_id: number; order: Order }) {
    try {
      const sockets = await this.userRedisService.getUserSocketClients(user_id);

      if (!sockets || sockets.length === 0) {
        console.log(`User ${user_id} hozirda oflayn.`);
        return;
      }

      const payload = {
        order,
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
