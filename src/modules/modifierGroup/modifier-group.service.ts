import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModifierGroup } from './modifier-group.entity';
import { Repository } from 'typeorm';
import { FindAllModifierGroupFilterDto } from './dto/find-all-filter.dto';
import { UpdateModifierGroupDto } from './dto/update-modifier-group.dto';

@Injectable()
export class ModifierGroupService {
  constructor(
    @InjectRepository(ModifierGroup)
    private readonly repository: Repository<ModifierGroup>,
  ) {}

  async findAll({
    page = 1,
    limit = 10,
    product_id,
    name,
  }: FindAllModifierGroupFilterDto) {
    const qb = this.repository.createQueryBuilder('modifier_group');

    if (product_id) {
      qb.andWhere('modifier_group.product_id = :product_id', { product_id });
    }

    if (name) {
      qb.andWhere('LOWER(modifier_group.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    const skip = (page - 1) * limit;
    qb.orderBy('modifier_group.created_at', 'ASC').skip(skip).take(limit);

    const [modifier_groups, total] = await qb.getManyAndCount();

    return {
      modifier_groups,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    if (!id) {
      throw new BadRequestException(
        'Modifier group id sini yuborish majburiy uni params da yuboring!',
      );
    }

    const group = await this.repository.findOne({
      where: { id },
      relations: { modifiers: true, product: true },
    });

    if (!group) {
      throw new NotFoundException('Modifier group topilmadi!');
    }

    return group;
  }

  async update(id: string, dto: UpdateModifierGroupDto) {
    if (!id) {
      throw new BadRequestException(
        'Modifier group id sini yuborish majburiy uni params da yuboring!',
      );
    }

    const hasUpdateField = Object.values(dto).some(
      (value) => value !== undefined,
    );
    if (!hasUpdateField) {
      throw new BadRequestException('Hech qanday maydon yuborilmadi!');
    }

    const group = await this.repository.findOne({
      where: { id },
      relations: { product: true },
    });
    if (!group) {
      throw new NotFoundException('Modifier group topilmadi!');
    }

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.sort_order !== undefined) group.sort_order = dto.sort_order;
    if (dto.min_selected_amount !== undefined) {
      group.min_selected_amount = dto.min_selected_amount;
    }
    if (dto.max_selected_amount !== undefined) {
      group.max_selected_amount = dto.max_selected_amount;
    }

    if (group.min_selected_amount > group.max_selected_amount) {
      throw new BadRequestException(
        "min_selected_amount max_selected_amount dan katta bo'lishi mumkin emas!",
      );
    }

    return this.repository.save(group);
  }
}
