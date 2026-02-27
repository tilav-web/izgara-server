import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Order } from '../../../order/schemas/order.entity';
import { UserRedisService } from '../../../redis/user-redis.service';
import { AuthRoleEnum } from '../../../auth/enums/auth-role.enum';
import { ORDER_SOCKET_EVENTS } from './constants';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrderGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly userRedisService: UserRedisService) {}

  async emitOrderEvent({
    order,
    action,
    user_id,
    owner = true,
    roles = [],
  }: {
    order: Order;
    action: 'created' | 'updated';
    user_id?: number;
    owner?: boolean;
    roles?: AuthRoleEnum[];
  }) {
    try {
      const ownerUserId = user_id ?? order.user_id;
      const uniqueRoles = [...new Set(roles)];
      const roleSocketsList = await Promise.all(
        uniqueRoles.map((role) =>
          this.userRedisService.getRoleSocketClients(role),
        ),
      );
      const roleSockets = roleSocketsList.flat();

      const ownerSockets =
        owner && ownerUserId
          ? await this.userRedisService.getUserSocketClients(ownerUserId)
          : [];

      const targetSockets = [...new Set([...ownerSockets, ...roleSockets])];

      if (targetSockets.length === 0) {
        console.log(
          `Order ${order.id} uchun emit qabul qiluvchi socket topilmadi.`,
        );
        return;
      }

      const payload = {
        order,
        action,
        timestamp: new Date().toISOString(),
      };

      targetSockets.forEach((id) => {
        this.server.to(id).emit(ORDER_SOCKET_EVENTS.HANDLE_ORDER, payload);
      });

      console.log(
        `Order socket emit yuborildi (${action}): ${JSON.stringify({
          order_id: order.id,
          targets: targetSockets.length,
        })}`,
      );
    } catch (error) {
      console.error('Socket emit xatosi:', error);
    }
  }

  async handleOrder({ user_id, order }: { user_id: number; order: Order }) {
    await this.emitOrderEvent({
      order,
      user_id,
      action: 'updated',
      roles: [AuthRoleEnum.SUPERADMIN],
    });
  }
}
