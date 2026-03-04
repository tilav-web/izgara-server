import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Modifier } from './modifier.entity';
import { In, Repository } from 'typeorm';
import { OrderModifierDto } from '../order/dto/order-modifier.dto';
import { FindAllModifierFilterDto } from './dto/find-all-filter.dto';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';

@Injectable()
export class ModifierService {
  constructor(
    @InjectRepository(Modifier)
    private readonly repository: Repository<Modifier>,
    @InjectRepository(ModifierGroup)
    private readonly modifierGroupRepository: Repository<ModifierGroup>,
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

  async findAll(
    {
      page = 1,
      limit = 10,
      group_id,
      product_id,
      name,
      price_min,
      price_max,
      is_active,
    }: FindAllModifierFilterDto,
    role?: AuthRoleEnum,
  ) {
    const qb = this.repository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.group', 'group');

    if (group_id) {
      qb.andWhere('group.id = :group_id', { group_id });
    }

    if (product_id) {
      qb.andWhere('group.product_id = :product_id', { product_id });
    }

    if (name) {
      qb.andWhere('LOWER(modifier.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    if (price_min !== undefined && price_max !== undefined) {
      if (price_min > price_max) {
        throw new BadRequestException(
          "Narx bo'yicha qidirish uchun min va max mantiqan to'g'ri bo'lishi kerak!",
        );
      }
      qb.andWhere('modifier.price BETWEEN :price_min AND :price_max', {
        price_min,
        price_max,
      });
    } else if (price_min !== undefined) {
      qb.andWhere('modifier.price >= :price_min', { price_min });
    } else if (price_max !== undefined) {
      qb.andWhere('modifier.price <= :price_max', { price_max });
    }

    if (role !== AuthRoleEnum.SUPERADMIN) {
      qb.andWhere('modifier.is_active = true');
    } else if (is_active !== undefined) {
      qb.andWhere('modifier.is_active = :is_active', { is_active });
    }

    const skip = (page - 1) * limit;
    qb.orderBy('modifier.created_at', 'ASC').skip(skip).take(limit);

    const [modifiers, total] = await qb.getManyAndCount();

    return {
      modifiers,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    if (!id) {
      throw new BadRequestException(
        'Modifier id sini yuborish majburiy uni params da yuboring!',
      );
    }

    const modifier = await this.repository.findOne({
      where: { id },
      relations: { group: true },
    });

    if (!modifier) {
      throw new NotFoundException('Modifier topilmadi!');
    }

    return modifier;
  }

  async update(id: string, dto: UpdateModifierDto) {
    if (!id) {
      throw new BadRequestException(
        'Modifier id sini yuborish majburiy uni params da yuboring!',
      );
    }

    const hasUpdateField = Object.values(dto).some(
      (value) => value !== undefined,
    );
    if (!hasUpdateField) {
      throw new BadRequestException('Hech qanday maydon yuborilmadi!');
    }

    const modifier = await this.repository.findOne({
      where: { id },
      relations: { group: true },
    });
    if (!modifier) {
      throw new NotFoundException('Modifier topilmadi!');
    }

    if (dto.name !== undefined) modifier.name = dto.name;
    if (dto.image !== undefined) modifier.image = dto.image;
    if (dto.max_quantity !== undefined)
      modifier.max_quantity = dto.max_quantity;
    if (dto.sort_order !== undefined) modifier.sort_order = dto.sort_order;
    if (dto.is_active !== undefined) modifier.is_active = dto.is_active;

    return this.repository.save(modifier);
  }
}
