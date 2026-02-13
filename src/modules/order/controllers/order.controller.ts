import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../../auth/enums/auth-role.enum';
import { AuthRoleGuard } from '../../auth/guard/role.guard';
import { FilterOrderDto } from '../dto/filter-order.dto';
import { AuthStatusGuard } from '../../auth/guard/status.guard';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get('/')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async findAll(@Query() dto: FilterOrderDto) {
    return this.orderService.findAll(dto);
  }

  @Post('/create')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const auth = req.user as { id: number };
    return this.orderService.createOrder(auth.id, dto);
  }

  @Get('/find/my-orders')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async findMyOrders(
    @Req() req: Request,
    @Query() { page, limit }: { page?: number; limit?: number },
  ) {
    const auth = req.user as { id: number };
    return this.orderService.findOrdersByAuthId(auth.id, { page, limit });
  }

  @Patch('/update/:id')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async updateOrderForAdmin(
    @Body() dto: UpdateOrderDto,
    @Param('id') order_id: string,
  ) {
    return this.orderService.updateOrderForAdmin(order_id, dto);
  }

  @Get('/find-one/:id')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async findOneForAdmin(@Param('id') order_id: string) {
    return this.orderService.findOneMoreOptions({ order_id });
  }

  @Get('/find-my-one/:id')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async findOne(@Param('id') order_id: string, @Req() req: Request) {
    const auth = req.user as { id: number };
    return this.orderService.findOneMoreOptions({
      order_id,
      auth_id: auth.id ?? 'auth_id_not_found',
    });
  }

  @Post('/cancelled/:id')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async cancelledOrder(@Param('id') order_id: string, @Req() req: Request) {
    const auth = req.user as { id: number };
    return this.orderService.cancelledOrder({
      order_id,
      auth_id: auth.id,
    });
  }
}
