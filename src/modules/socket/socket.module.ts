import { SocketGateway } from './gateways/socket.gateway';
import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OrderGateway } from './gateways/order/order.gateway';

@Module({
  imports: [UserModule],
  providers: [SocketGateway, OrderGateway],
  exports: [SocketGateway, OrderGateway],
})
export class SocketModule {}
