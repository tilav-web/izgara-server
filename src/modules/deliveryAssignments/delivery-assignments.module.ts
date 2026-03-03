import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAssignmentsController } from './delivery_assignments.controller';
import { DeliveryAssignmentsService } from './delivery_assignments.service';
import { DeliveryAssignment } from './delivery_assignments.entity';
import { Auth } from '../auth/auth.entity';
import { Order } from '../order/schemas/order.entity';
import { UserModule } from '../user/user.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryAssignment, Auth, Order]),
    UserModule,
    SocketModule,
  ],
  controllers: [DeliveryAssignmentsController],
  providers: [DeliveryAssignmentsService],
  exports: [DeliveryAssignmentsService],
})
export class DeliveryAssignmentsModule {}
