import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      return acc + Number(item.price) * quantity;
    }, 0);

    return { total_price };
  }

  async findByIds(dto?: OrderModifierDto[]) {
    // 1. Bo'sh yoki undefined bo'lsa qaytarish
    if (!dto || dto.length === 0) return [];

    // 2. Takroriy id tekshirish
    const ids = dto.map((item) => item.modifier_id);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length !== ids.length)
      throw new BadRequestException('Takroriy modifierlar mavjud!');

    // 3. Bazadan olish
    const modifiers = await this.repository.find({
      where: { id: In(uniqueIds) },
    });

    // 4. Mavjud bo'lmagan modifier tekshirish
    if (modifiers.length !== uniqueIds.length) {
      const foundIds = modifiers.map((m) => m.id);
      const missingIds = uniqueIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Quyidagi modifierlar topilmadi: ${missingIds.join(', ')}`,
      );
    }

    // 5. Quantity qo'shish
    return modifiers.map((modifier) => {
      const found = dto.find((d) => d.modifier_id === modifier.id)!;
      return { ...modifier, quantity: found.quantity };
    });
  }
}
