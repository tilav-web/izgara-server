import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DeliveryAssignmentsService } from './delivery_assignments.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { AuthStatusGuard } from '../auth/guard/status.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FindAllDeliveryAssignmentsDto } from './dto/find-all-delivery-assignments.dto';

@ApiTags('Delivery Assignments')
@Controller('delivery-assignments')
@UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
@Roles(AuthRoleEnum.DELIVERY)
@ApiBearerAuth('access_token')
export class DeliveryAssignmentsController {
  constructor(
    private readonly deliveryAssignmentsService: DeliveryAssignmentsService,
  ) {}

  @Get('/')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiOperation({
    summary:
      'Super admin uchun delivery assignmentlar ro‘yxati (pagination + filter)',
  })
  async findAllForSuperAdmin(@Query() query: FindAllDeliveryAssignmentsDto) {
    return this.deliveryAssignmentsService.findAllForSuperAdmin({
      status: query.status,
      order_id: query.order_id,
      delivery_id: query.delivery_id,
      from_date: query.from_date,
      to_date: query.to_date,
      page: query.page,
      limit: query.limit,
    });
  }

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
