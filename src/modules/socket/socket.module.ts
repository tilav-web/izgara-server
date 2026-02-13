import { SocketGateway } from './gateways/socket.gateway';
import { Module } from '@nestjs/common';
import { OrderGateway } from './gateways/order.gateway';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [SocketGateway, OrderGateway],
  exports: [SocketGateway, OrderGateway],
})
export class SocketModule {}
