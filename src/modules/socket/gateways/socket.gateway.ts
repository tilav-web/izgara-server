import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRedisService } from '../../redis/user-redis.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly userRedisService: UserRedisService) {}

  async handleConnection(client: Socket) {
    try {
      const user_id = Number(client.handshake.query.user_id);

      if (!user_id) {
        console.log(`User ID topilmadi, ulanish rad etildi: ${client.id}`);
        client.disconnect();
        return;
      }

      // 2. Redisga yozish
      await this.userRedisService.setUserWithSocketClientId({
        user_id,
        client_id: client.id,
      });

      console.log(`User ${user_id} ulandi. Socket ID: ${client.id}`);
    } catch (error) {
      console.error('Connection xatosi:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const user_id = Number(client.handshake.query.user_id);

      if (user_id) {
        await this.userRedisService.removeSocketClientId(user_id, client.id);
        console.log(`User ${user_id} uzildi. Socket ID: ${client.id}`);
      }
    } catch (error) {
      console.error('Disconnect xatosi:', error);
    }
  }
}
