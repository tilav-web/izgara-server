import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../schemas/order.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly repository: Repository<Order>,
  ) {}

  async findById(id: string) {
    return this.repository.findOne({ where: { id } });
  }

  async markAsPaid(id: string) {}

  async createOrder() {
    
  }
}
