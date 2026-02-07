import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../../auth/enums/auth-role.enum';
import { AuthRoleGuard } from '../../auth/guard/role.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get('/')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @ApiBearerAuth('access_token')
  async findAll() {
    return this.orderService.findAll();
  }

  @Post('/create')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access_token')
  async createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const auth = req.user as { id: number };
    return this.orderService.createOrder(auth.id, dto);
  }
}
