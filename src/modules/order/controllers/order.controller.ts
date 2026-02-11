import {
  Body,
  Controller,
  Get,
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
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access_token')
  async createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const auth = req.user as { id: number };
    return this.orderService.createOrder(auth.id, dto);
  }

  @Get('/find/my-orders')
  @UseGuards(AuthGuard('jwt'))
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
    @Query('id') order_id: string,
  ) {
    return this.orderService.updateOrderForAdmin(order_id, dto);
  }
}
