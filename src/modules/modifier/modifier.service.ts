import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Modifier } from './modifier.entity';
import { In, Repository } from 'typeorm';
import { OrderModifierDto } from '../order/dto/order-modifier.dto';

@Injectable()
export class ModifierService {
  constructor(
    @InjectRepository(Modifier)
    private readonly repository: Repository<Modifier>,
  ) {}

  async getTotalPrice(dto?: OrderModifierDto[]) {
    if (!dto || dto.length === 0) return { total_price: 0 };

    const ids = dto.map((item) => item.modifier_id);

    const modifiers = await this.repository.find({
      where: {
        id: In(ids),
      },
    });

    if (!modifiers.length) return { total_price: 0 };

    const quantityMap = new Map<string, number>();
    dto.forEach((item) => quantityMap.set(item.modifier_id, item.quantity));

    const total_price = modifiers.reduce((acc, item) => {
      const quantity = quantityMap.get(item.id);
      if (!quantity) return acc;
      return acc + item.price * quantity;
    }, 0);

    return { total_price };
  }
}
