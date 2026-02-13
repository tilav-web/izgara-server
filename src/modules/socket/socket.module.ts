import { SocketGateway } from './gateways/socket.gateway';
import { Module } from '@nestjs/common';
import { OrderGateway } from './gateways/order.gateway';

@Module({
  providers: [SocketGateway, OrderGateway],
  exports: [SocketGateway, OrderGateway],
})
export class SocketModule {}
