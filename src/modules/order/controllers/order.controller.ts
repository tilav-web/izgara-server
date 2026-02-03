import { Controller } from '@nestjs/common';
import { OrderService } from '../services/order.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}
}
