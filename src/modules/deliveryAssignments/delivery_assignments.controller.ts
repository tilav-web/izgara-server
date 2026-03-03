import { Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { DeliveryAssignmentsService } from './delivery_assignments.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { AuthStatusGuard } from '../auth/guard/status.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

@Controller('delivery-assignments')
@UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
@Roles(AuthRoleEnum.DELIVERY)
@ApiBearerAuth('access_token')
export class DeliveryAssignmentsController {
  constructor(
    private readonly deliveryAssignmentsService: DeliveryAssignmentsService,
  ) {}

  @Patch('/accept/:order_id')
  async acceptOrder(@Param('order_id') order_id: string, @Req() req: Request) {
    const auth = req.user as { id: number };
    return this.deliveryAssignmentsService.acceptReadyOrderByAuthId({
      order_id,
      auth_id: auth.id,
    });
  }

  @Patch('/pickup/:order_id')
  async pickUpOrder(@Param('order_id') order_id: string, @Req() req: Request) {
    const auth = req.user as { id: number };
    return this.deliveryAssignmentsService.markPickedUpByAuthId({
      order_id,
      auth_id: auth.id,
    });
  }

  @Patch('/deliver/:order_id')
  async deliverOrder(@Param('order_id') order_id: string, @Req() req: Request) {
    const auth = req.user as { id: number };
    return this.deliveryAssignmentsService.markDeliveredByAuthId({
      order_id,
      auth_id: auth.id,
    });
  }
}
