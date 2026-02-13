import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UserRedisService } from '../../redis/user-redis.service';
import { JwtTypeEnum } from '../../auth/enums/jwt-type.enum';
import { UserService } from '../../user/user.service';

type SocketData = {
  user_id?: number;
};

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly userRedisService: UserRedisService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  private extractToken(
    client: Socket<any, any, any, SocketData>,
  ): string | null {
    const authToken = client.handshake.auth?.token as string;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string') {
      const [type, token] = authorizationHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    return null;
  }

  async handleConnection(client: Socket<any, any, any, SocketData>) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Token topilmadi');
      }

      const payload = await this.jwtService.verifyAsync<{
        id: number;
        type: JwtTypeEnum;
      }>(token);

      if (payload.type !== JwtTypeEnum.ACCESS || !payload.id) {
        throw new UnauthorizedException('Token yaroqsiz');
      }

      const user = await this.userService.findByAuthId(payload.id);
      if (!user?.id) {
        throw new ForbiddenException('Foydalanuvchi topilmadi');
      }

      client.data.user_id = user.id;
      await this.userRedisService.setUserWithSocketClientId({
        user_id: user.id,
        client_id: client.id,
      });

      console.log(`User ${user.id} ulandi. Socket ID: ${client.id}`);
    } catch (error) {
      console.error('Connection xatosi:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket<any, any, any, SocketData>) {
    try {
      const user_id = Number(client.data.user_id);

      if (user_id) {
        await this.userRedisService.removeSocketClientId(user_id, client.id);
        console.log(`User ${user_id} uzildi. Socket ID: ${client.id}`);
      }
    } catch (error) {
      console.error('Disconnect xatosi:', error);
    }
  }
}
